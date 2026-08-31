import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Bookmark,
  Camera,
  Edit,
  Heart,
  Info,
  Lock,
  LogOut,
  Send,
  Settings,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { validateProfile } from '../../../lib/validation';
import { useAuth } from '../../hooks/auth-context';
import { uploadAvatar } from '../../services/upload';
import { AvatarImage } from '../../components/avatar-image';
import {
  getPrayerCircleCount,
  getProfilePreferences,
  updateProfile,
  updateProfilePreferences,
  getMyProfile,
  getMyPrayers,
  getMyPrayedForPrayers,
  getMySavedIds,
} from '../../services/supabase-queries';
import { useGeolocation } from '../../hooks/use-geolocation';
import { useActivityUpdates } from '../../hooks/activity-updates-context';
import { ProfileEditDrawer } from './profile-edit-drawer';
import { ProfileLoadingState } from './profile-loading-state';

const PRAYER_CIRCLE_LIMIT = 12;

type ProfileDetails = {
  username: string;
  displayName: string;
  display_name?: string;
  bio?: string;
  location?: string;
  photo?: string;
};

function formatDetectedLocation(location: { city: string; country: string }) {
  return [location.city, location.country].filter(Boolean).join(', ');
}

export function Profile() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { liveVersion, unreadCount: unreadUpdates } = useActivityUpdates();
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileLoadFailed, setProfileLoadFailed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Load profile from Supabase on mount
  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      await Promise.resolve();
      if (!active) return;

      if (!user?.id) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      setProfileLoadFailed(false);
      const supabaseProfile = await getMyProfile();
      if (!active) return;

      if (!supabaseProfile) {
        setProfile(null);
        setProfileLoadFailed(true);
        setProfileLoading(false);
        return;
      }

      setProfile({
        username: supabaseProfile.username,
        displayName: supabaseProfile.display_name || supabaseProfile.username,
        display_name: supabaseProfile.display_name || undefined,
        bio: supabaseProfile.bio || '',
        location: supabaseProfile.location || '',
        photo: supabaseProfile.avatar_url || undefined,
      });
      setProfileLoading(false);
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [liveVersion, user?.id]);
  const [publicPrayers, setPublicPrayers] = useState<number>(0);
  const [circlePrayers, setCirclePrayers] = useState<number>(0);
  const [privatePrayers, setPrivatePrayers] = useState<number>(0);
  const [myPrayedFor, setMyPrayedFor] = useState<number>(0);
  const [savedCount, setSavedCount] = useState<number>(0);

  useEffect(() => {
    let active = true;

    const loadPrayerCounts = async () => {
      if (!user?.id) return;
      const [submitted, prayedFor, savedIds] = await Promise.all([
        getMyPrayers(),
        getMyPrayedForPrayers(),
        getMySavedIds(),
      ]);
      if (!active) return;
      setPublicPrayers(submitted.filter((prayer) => (prayer.audience || 'public') === 'public').length);
      setCirclePrayers(submitted.filter((prayer) => prayer.audience === 'circle').length);
      setPrivatePrayers(submitted.filter((prayer) => prayer.audience === 'private').length);
      setMyPrayedFor(prayedFor.length);
      setSavedCount(savedIds.length);
    };

    void loadPrayerCounts();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const {
    location: geoLocation,
    loading: geoLoading,
    denied: geoDenied,
    requestLocation,
  } = useGeolocation();
  const requestLocationRef = useRef(requestLocation);
  const [useAutoLocation, setUseAutoLocation] = useState(false);
  const [profileLocationMode, setProfileLocationMode] = useState<'manual' | 'auto'>('manual');
  const [newBio, setNewBio] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [editError, setEditError] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUploadStatus, setPhotoUploadStatus] = useState('');
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const username = profile?.username || '';
  const displayName = profile?.displayName || username;
  const avatarSource = avatarPreviewUrl || profile?.photo;

  const [circleCount, setCircleCount] = useState(0);
  const detectingAutoLocation = useAutoLocation && geoLoading && !geoLocation;

  useEffect(() => {
    requestLocationRef.current = requestLocation;
  }, [requestLocation]);

  useEffect(() => {
    let active = true;

    const loadProfilePreferences = async () => {
      if (!user?.id) {
        setProfileLocationMode('manual');
        return;
      }

      const prefs = await getProfilePreferences();
      if (active) setProfileLocationMode(prefs.profile_location_mode);
    };

    void loadProfilePreferences();

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;

    const loadCircleCount = async () => {
      if (!user?.id) return;
      const count = await getPrayerCircleCount(user.id);
      if (!active) return;
      setCircleCount(count);
    };

    void loadCircleCount();

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!avatarPreviewUrl) return;
    return () => URL.revokeObjectURL(avatarPreviewUrl);
  }, [avatarPreviewUrl]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = e.target.files?.[0];
    if (!file) return;

    setEditError('');
    setPhotoUploadStatus('Checking photo...');
    setAvatarPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });

    try {
      setUploadingPhoto(true);
      const result = await uploadAvatar(file, {
        onStatusChange: (status) => {
          setPhotoUploadStatus(
            {
              checking: 'Checking photo...',
              converting: 'Converting iPhone photo...',
              preparing: 'Preparing photo...',
              uploading: 'Uploading photo...',
            }[status]
          );
        },
      });

      if (result.error !== null) {
        setEditError(result.error);
        setAvatarPreviewUrl(null);
        return;
      }

      const avatarUrl = result.url;

      if (!user?.id) {
        setEditError('Please sign in again before changing your photo.');
        setAvatarPreviewUrl(null);
        return;
      }

      setPhotoUploadStatus('Saving photo...');
      const saved = await updateProfile({ avatar_url: avatarUrl });
      if (!saved) {
        setEditError(
          "We uploaded your photo, but couldn't save it to your profile. Please try again."
        );
        setAvatarPreviewUrl(null);
        return;
      }

      setProfile((prev) => (prev ? { ...prev, photo: avatarUrl } : prev));
    } finally {
      setUploadingPhoto(false);
      setPhotoUploadStatus('');
      setAvatarPreviewUrl(null);
      input.value = '';
    }
  };

  // Initialize edit drawer fields
  useEffect(() => {
    const syncEditFields = () => {
      if (!editOpen || !profile) return;
      setNewUsername(profile.username);
      setNewDisplayName(profile.displayName);
      setNewBio(profile.bio || '');
      setNewLocation(profile.location || '');
      setUseAutoLocation(profileLocationMode === 'auto');
      setEditError('');
      if (profileLocationMode === 'auto') void requestLocationRef.current();
    };

    syncEditFields();
  }, [editOpen, profile, profileLocationMode]);

  useEffect(() => {
    if (!useAutoLocation || !geoLocation) return;
    setNewLocation(formatDetectedLocation(geoLocation));
  }, [geoLocation, useAutoLocation]);

  const handleSignOut = async () => {
    await signOut();
    void navigate('/landing');
  };

  const handleAutoLocationToggle = () => {
    const next = !useAutoLocation;
    setUseAutoLocation(next);
    setEditError('');

    if (next) {
      void requestLocation().then((detected) => {
        if (detected) setNewLocation(formatDetectedLocation(detected));
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!profile || savingProfile) return;
    setEditError('');
    const trimmedUsername = newUsername.trim().toLowerCase();
    const trimmedDisplayName = newDisplayName.trim();

    const validation = validateProfile({
      username: trimmedUsername,
      displayName: trimmedDisplayName,
    });
    if (!validation.success) {
      const firstError = Object.values(validation.errors || {})[0];
      setEditError(firstError || 'Invalid input');
      return;
    }
    const nextUsername = validation.data?.username || trimmedUsername;

    if (!user?.id) return;

    let locationToSave = newLocation.trim();
    if (useAutoLocation) {
      const detected = geoLocation ?? (await requestLocation());
      if (!detected) {
        setEditError(
          geoDenied
            ? 'Allow location access in your browser, then try again.'
            : "We couldn't detect your location. Try again or switch off auto-detect."
        );
        return;
      }
      locationToSave = formatDetectedLocation(detected);
    }

    setSavingProfile(true);
    try {
      const [profileSaved, preferencesSaved] = await Promise.all([
        updateProfile({
          username: nextUsername,
          display_name: trimmedDisplayName || undefined,
          bio: newBio.trim() || undefined,
          location: locationToSave || undefined,
        }),
        updateProfilePreferences({
          profile_location_mode: useAutoLocation ? 'auto' : 'manual',
        }),
      ]);

      if (!profileSaved || !preferencesSaved) {
        setEditError("We couldn't save your changes. The username may already be taken.");
        return;
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              username: nextUsername,
              displayName: trimmedDisplayName || nextUsername,
              bio: newBio.trim(),
              location: locationToSave,
            }
          : prev
      );
      window.dispatchEvent(new Event('oratio-profile-updated'));
      setProfileLocationMode(useAutoLocation ? 'auto' : 'manual');
      setEditOpen(false);
    } finally {
      setSavingProfile(false);
    }
  };

  if (profileLoading) {
    return <ProfileLoadingState />;
  }

  if (profileLoadFailed || !profile) {
    return (
      <div
        className="w-full h-full flex flex-col overflow-hidden"
        style={{ background: 'rgb(var(--rgb-bg))' }}
      >
        <div className="relative z-10 px-5 overflow-y-auto overflow-x-hidden flex-1 h-full pt-24 pb-28">
          <div className="max-w-md mx-auto text-center py-16">
            <p className="text-text-muted text-sm mb-2">We could not load your profile.</p>
            <p className="text-text-dim text-xs mb-5">Please refresh and try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="min-h-11 px-5 py-2 rounded-full text-xs text-accent bg-accent/8 border border-accent/12 cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: 'rgb(var(--rgb-bg))' }}
    >
      <div className="relative z-10 px-5 overflow-y-auto overflow-x-hidden flex-1 h-full pt-24 pb-28">
        <div className="max-w-md mx-auto">
          {/* Profile header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="relative flex-shrink-0">
              <AvatarImage
                src={avatarSource}
                name={displayName || username}
                alt={username || 'User'}
                className="h-20 w-20 text-2xl"
              />
              <button
                onClick={() => setEditOpen(true)}
                className="absolute -bottom-3 -right-3 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer"
                aria-label="Change profile photo"
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgb(var(--rgb-bg))',
                    border: '2px solid rgba(var(--rgb-accent), 0.15)',
                  }}
                >
                  <Camera size={12} className="text-accent" />
                </span>
              </button>
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-text font-heading text-base font-medium truncate">
                  {displayName}
                </h1>
                <button
                  onClick={() => setEditOpen(true)}
                  className="h-10 w-10 -ml-2 rounded-full flex items-center justify-center text-text-dim hover:text-accent hover:bg-accent/6 transition-colors cursor-pointer"
                  aria-label="Edit profile"
                >
                  <Edit size={12} />
                </button>
              </div>
              <p className="text-text-dim text-xs mb-1">@{username}</p>
              {profile.bio && (
                <p className="text-text-secondary text-xs mb-1.5 leading-relaxed">{profile.bio}</p>
              )}
              {profile.location && (
                <p className="text-text-dim text-[10px] mb-2">📍 {profile.location}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void handleSignOut()}
                  className="w-11 h-11 flex items-center justify-center rounded-full cursor-pointer active:scale-95 transition-transform"
                  style={{
                    background: 'rgba(var(--rgb-accent), 0.06)',
                    border: '1px solid rgba(var(--rgb-accent), 0.1)',
                  }}
                  aria-label="Sign out"
                >
                  <LogOut size={16} className="text-text-muted" />
                </button>
                <button
                  onClick={() => void navigate('/info')}
                  className="w-11 h-11 flex items-center justify-center rounded-full cursor-pointer active:scale-95 transition-transform"
                  style={{
                    background: 'rgba(var(--rgb-accent), 0.06)',
                    border: '1px solid rgba(var(--rgb-accent), 0.1)',
                  }}
                  aria-label="About"
                >
                  <Info size={16} className="text-text-muted" />
                </button>
                <button
                  onClick={() => void navigate('/profile/settings')}
                  className="w-11 h-11 flex items-center justify-center rounded-full cursor-pointer active:scale-95 transition-transform"
                  style={{
                    background: 'rgba(var(--rgb-accent), 0.06)',
                    border: '1px solid rgba(var(--rgb-accent), 0.1)',
                  }}
                  aria-label="Settings"
                >
                  <Settings size={16} className="text-text-muted" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <section>
              <p className="oratio-section-label mb-2 px-1">
                Prayer Library
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => void navigate('/profile/submitted?view=public')}
                  className="oratio-quiet-row w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left cursor-pointer"
                >
                  <Send size={18} className="text-text-dim flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-text text-sm font-medium">Public prayers</p>
                    <p className="text-text-dim text-xs mt-0.5">
                      {publicPrayers} shared on the public feed.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => void navigate('/profile/submitted?view=circle')}
                  className="oratio-quiet-row w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left cursor-pointer"
                >
                  <Users size={18} className="text-text-dim flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-text text-sm font-medium">Prayer Circle prayers</p>
                    <p className="text-text-dim text-xs mt-0.5">
                      {circlePrayers} shared with your Prayer Circle.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => void navigate('/profile/submitted?view=private')}
                  className="oratio-quiet-row w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left cursor-pointer"
                >
                  <Lock size={18} className="text-accent flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-text text-sm font-medium">Private prayers</p>
                    <p className="text-text-dim text-xs mt-0.5">
                      {privatePrayers} kept just for you.
                    </p>
                  </div>
                </button>
              </div>
            </section>

            <section>
              <p className="oratio-section-label mb-2 px-1">
                Activity
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => void navigate('/updates')}
                  className="oratio-quiet-row w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left cursor-pointer"
                >
                  <Bell size={18} className="text-accent flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-text text-sm font-medium">Updates</p>
                    <p className="text-text-dim text-xs mt-0.5">
                      {unreadUpdates > 0
                        ? `${unreadUpdates} unread update${unreadUpdates !== 1 ? 's' : ''} for you.`
                        : 'Prayers, comments, invites, and moderation updates.'}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => void navigate('/profile/prayed')}
                  className="oratio-quiet-row w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left cursor-pointer"
                >
                  <Heart size={18} className="text-text-dim flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-text text-sm font-medium">Prayed for</p>
                    <p className="text-text-dim text-xs mt-0.5">
                      {myPrayedFor} prayer{myPrayedFor !== 1 ? 's' : ''} you marked.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => void navigate('/profile/saved')}
                  className="oratio-quiet-row w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left cursor-pointer"
                >
                  <Bookmark size={18} className="text-text-dim flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-text text-sm font-medium">Saved prayers</p>
                    <p className="text-text-dim text-xs mt-0.5">
                      {savedCount} prayer{savedCount !== 1 ? 's' : ''} saved for later.
                    </p>
                  </div>
                </button>
              </div>
            </section>

            <section>
              <p className="oratio-section-label mb-2 px-1">
                People
              </p>
              <button
                onClick={() => void navigate('/profile/circle')}
                className="oratio-quiet-row w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left cursor-pointer"
              >
                <Users size={18} className="text-text-dim flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-text text-sm font-medium">Manage Prayer Circle</p>
                  <p className="text-text-dim text-xs mt-0.5">
                    {circleCount} of {PRAYER_CIRCLE_LIMIT} spaces filled.
                  </p>
                </div>
              </button>
            </section>
          </div>
        </div>
      </div>

      {/* Edit Profile Drawer */}
      <ProfileEditDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        avatarSource={avatarSource}
        displayName={displayName}
        username={username}
        uploadingPhoto={uploadingPhoto}
        photoUploadStatus={photoUploadStatus}
        newUsername={newUsername}
        newDisplayName={newDisplayName}
        newBio={newBio}
        newLocation={newLocation}
        useAutoLocation={useAutoLocation}
        geoLocation={geoLocation}
        geoLoading={geoLoading}
        geoDenied={geoDenied}
        editError={editError}
        savingProfile={savingProfile}
        detectingAutoLocation={detectingAutoLocation}
        onPhotoUpload={(e) => void handlePhotoUpload(e)}
        onUsernameChange={(value) => {
          setNewUsername(value);
          setEditError('');
        }}
        onDisplayNameChange={(value) => {
          setNewDisplayName(value);
          setEditError('');
        }}
        onBioChange={setNewBio}
        onLocationChange={setNewLocation}
        onAutoLocationToggle={handleAutoLocationToggle}
        onSave={() => void handleSaveProfile()}
        onRequestLocation={() => void requestLocation()}
      />
    </div>
  );
}
