import { useState, useEffect } from "react";
import {
  Send,
  LogOut,
  Edit,
  Bookmark,
  Info,
  Camera,
  Settings,
} from "lucide-react";
import { Drawer } from "vaul";
import { useNavigate } from "react-router";
import { validateProfile } from "../../lib/validation";
import { useAuth } from "../../lib/auth-context";
import { uploadAvatar, getInitialAvatarUrl } from "../../lib/upload";
import { getFollowCounts, updateProfile, getMyProfile, getMyPrayers, getMyPrayedForPrayers, getSavedPrayers } from "../../lib/supabase-queries";
import { useGeolocation } from "../../lib/use-geolocation";
export function Profile() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState<{
    username: string;
    displayName: string;
    display_name?: string;
    bio?: string;
    location?: string;
    photo?: string;
  }>({ username: "", displayName: "" });
  const [editOpen, setEditOpen] = useState(false);

  // Load profile from Supabase on mount
  useEffect(() => {
    if (user?.id) {
      getMyProfile().then((supabaseProfile) => {
        if (supabaseProfile) {
          setProfile({
            username: supabaseProfile.username,
            displayName: supabaseProfile.display_name || supabaseProfile.username,
            display_name: supabaseProfile.display_name || undefined,
            bio: supabaseProfile.bio || "",
            location: supabaseProfile.location || "",
          });
        }
      });
    }
  }, [user?.id]);
  const [myPrayers, setMyPrayers] = useState<number>(0);
  const [myPrayedFor, setMyPrayedFor] = useState<number>(0);

  useEffect(() => {
    if (user?.id) {
      getMyPrayers().then(p => setMyPrayers(p.length));
      getMyPrayedForPrayers().then(p => setMyPrayedFor(p.length));
    }
  }, [user?.id]);

  const [newDisplayName, setNewDisplayName] = useState("");
  const { location: geoLocation, loading: geoLoading, denied: geoDenied, requestLocation } = useGeolocation();
  const [useAutoLocation, setUseAutoLocation] = useState(false);
  const [newBio, setNewBio] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [editError, setEditError] = useState<string>("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showSection, setShowSection] = useState<"prayers" | "saved">("prayers");

  const username = profile.username || "anonymous";
  const displayName = profile.displayName || username;

  const [savedCount, setSavedCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      getFollowCounts(user.id).then((counts) => setFollowingCount(counts.following));
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      getSavedPrayers().then(p => setSavedCount(p.length));
    }
  }, [user?.id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const url = await uploadAvatar(file);
    if (url) {
      setProfile(prev => ({ ...prev, photo: url }));
    }
    setUploadingPhoto(false);
  };

  // Initialize edit drawer fields
  useEffect(() => {
    if (editOpen) {
      setNewDisplayName(profile.displayName);
      setNewBio(profile.bio || "");
      setNewLocation(profile.location || "");
      setEditError('');
    }
  }, [editOpen, profile.displayName, profile.username, profile.bio, profile.location]);

  const handleSaveProfile = () => {
    setEditError("");
    const trimmedDisplayName = newDisplayName.trim();

    const validation = validateProfile({
      username: profile.username,
      displayName: trimmedDisplayName,
    });
    if (!validation.success) {
      const firstError = Object.values(validation.errors || {})[0];
      setEditError(firstError || "Invalid input");
      return;
    }

    if (user?.id) {
      void updateProfile({
        display_name: trimmedDisplayName || undefined,
        bio: newBio.trim() || undefined,
        location: newLocation.trim() || undefined,
      });
    }

    setProfile(prev => ({ ...prev, displayName: trimmedDisplayName || prev.username, bio: newBio.trim(), location: newLocation.trim() }));
    setEditOpen(false);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: "rgb(var(--rgb-bg))" }}>
      <div className="relative z-10 px-5 overflow-y-auto flex-1 h-full pt-24 pb-28">
        <div className="max-w-md mx-auto">
          {/* Profile header — Instagram style */}
          <div className="flex items-start gap-4 mb-6">
            <div className="relative flex-shrink-0">
              <img
                src={profile.photo || getInitialAvatarUrl(username)}
                alt={username || "User"}
                className="w-20 h-20 rounded-full object-cover"
              />
              <button
                onClick={() => setEditOpen(true)}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: "rgb(var(--rgb-bg))", border: "2px solid rgba(var(--rgb-accent), 0.15)" }}
              >
                <Camera size={10} className="text-accent" />
              </button>
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-text font-heading text-base font-medium truncate">
                  {displayName}
                </h1>
                <button onClick={() => setEditOpen(true)} className="text-text-dim hover:text-accent transition-colors cursor-pointer">
                  <Edit size={12} />
                </button>
              </div>
              <p className="text-text-dim text-xs mb-1">@{username}</p>
              {profile.bio && <p className="text-text-secondary text-xs mb-1.5 leading-relaxed">{profile.bio}</p>}
              {profile.location && <p className="text-text-dim text-[10px] mb-2">📍 {profile.location}</p>}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={async () => { await signOut(); void navigate("/landing"); }}
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] cursor-pointer"
                  style={{
                    background: "rgba(var(--rgb-accent), 0.06)",
                    border: "1px solid rgba(var(--rgb-accent), 0.1)",
                    color: "rgb(var(--rgb-text-muted))",
                  }}
                >
                  <LogOut size={10} />
                  Sign Out
                </button>
                <button
                  onClick={() => void navigate("/info")}
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] cursor-pointer"
                  style={{
                    background: "rgba(var(--rgb-accent), 0.06)",
                    border: "1px solid rgba(var(--rgb-accent), 0.1)",
                    color: "rgb(var(--rgb-text-muted))",
                  }}
                >
                  <Info size={10} />
                  Info
                </button>
                <button
                  onClick={() => void navigate("/profile/settings")}
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] cursor-pointer"
                  style={{
                    background: "rgba(var(--rgb-accent), 0.06)",
                    border: "1px solid rgba(var(--rgb-accent), 0.1)",
                    color: "rgb(var(--rgb-text-muted))",
                  }}
                >
                  <Settings size={10} />
                  Settings
                </button>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex justify-around mb-6 py-3 rounded-xl"
            style={{ background: "rgba(var(--rgb-surface), 0.4)", border: "1px solid rgba(var(--rgb-accent), 0.06)" }}
          >
            <button onClick={() => setShowSection("prayers")} className="text-center cursor-pointer">
              <p className="text-text text-sm font-medium">{myPrayers}</p>
              <p className="text-text-dim text-[10px]">Prayers</p>
            </button>
            <button onClick={() => void navigate("/profile/prayed")} className="text-center cursor-pointer">
              <p className="text-text text-sm font-medium">{myPrayedFor}</p>
              <p className="text-text-dim text-[10px]">Prayed For</p>
            </button>
            <button onClick={() => void navigate(`/user/${encodeURIComponent(username)}/followers`)} className="text-center cursor-pointer">
              <p className="text-text text-sm font-medium">0</p>
              <p className="text-text-dim text-[10px]">Followers</p>
            </button>
            <button onClick={() => void navigate(`/user/${encodeURIComponent(username)}/following`)} className="text-center cursor-pointer">
              <p className="text-text text-sm font-medium">{followingCount}</p>
              <p className="text-text-dim text-[10px]">Following</p>
            </button>
            <button onClick={() => void navigate("/profile/saved")} className="text-center cursor-pointer">
              <p className="text-text text-sm font-medium">{savedCount}</p>
              <p className="text-text-dim text-[10px]">Saved</p>
            </button>
          </div>

          {/* Section toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowSection("prayers")}
              className="px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer"
              style={{
                background: showSection === "prayers" ? "rgba(var(--rgb-accent), 0.12)" : "rgba(var(--rgb-accent), 0.04)",
                border: `1px solid ${showSection === "prayers" ? "rgba(var(--rgb-accent), 0.2)" : "rgba(var(--rgb-accent), 0.06)"}`,
                color: showSection === "prayers" ? "rgb(var(--rgb-accent))" : "rgb(var(--rgb-text-muted))",
              }}
            >
              <Send size={11} className="inline mr-1" />
              My Prayers
            </button>
            <button
              onClick={() => void navigate("/profile/prayed")}
              className="px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer"
              style={{
                background: "rgba(var(--rgb-accent), 0.04)",
                border: "1px solid rgba(var(--rgb-accent), 0.06)",
                color: "rgb(var(--rgb-text-muted))",
              }}
            >
              🙏 Prayed For
            </button>
            <button
              onClick={() => void navigate("/profile/saved")}
              className="px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer"
              style={{
                background: "rgba(var(--rgb-accent), 0.04)",
                border: "1px solid rgba(var(--rgb-accent), 0.06)",
                color: "rgb(var(--rgb-text-muted))",
              }}
            >
              <Bookmark size={11} className="inline mr-1" />
              Saved
            </button>
          </div>

          {/* Prayer list */}
          <div className="space-y-2">
            {showSection === "prayers" && (
              myPrayers > 0 ? (
                <div
                  onClick={() => void navigate("/profile/submitted")}
                  className="rounded-xl px-4 py-4 cursor-pointer active:scale-[0.99] transition-transform text-center"
                  style={{
                    background: "linear-gradient(160deg, rgba(var(--rgb-surface), 0.5), rgba(var(--rgb-surface), 0.3))",
                    border: "1px solid rgba(var(--rgb-accent), 0.05)",
                  }}
                >
                  <Send size={20} className="text-text-dim mx-auto mb-2" />
                  <p className="text-text text-sm font-medium">{myPrayers} prayer{myPrayers !== 1 ? "s" : ""}</p>
                  <p className="text-text-dim text-xs mt-1">Tap to view all</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Send size={20} className="text-text-dim mx-auto mb-2" />
                  <p className="text-text-muted text-sm mb-1">No prayers yet</p>
                  <button
                    onClick={() => void navigate('/submit')}
                    className="px-4 py-2 rounded-full text-xs text-accent bg-accent/8 border border-accent/12 cursor-pointer mt-2"
                  >
                    Submit Prayer
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Drawer */}
      <Drawer.Root open={editOpen} onOpenChange={setEditOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[600]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[600] bg-bg rounded-t-2xl p-6 outline-none"
            style={{ borderTop: "1px solid rgba(var(--rgb-accent), 0.1)", boxShadow: "0 -20px 60px rgba(0, 0, 0, 0.3)" }}
          >
            <div className="mx-auto w-12 h-1.5 bg-accent/20 rounded-full mb-6" />
            <Drawer.Title className="sr-only">Edit Profile</Drawer.Title>
            <Drawer.Description className="sr-only">Update your username and display name</Drawer.Description>

            <div className="max-w-md mx-auto">
              <h3 className="text-text text-center mb-4 font-heading text-lg">Edit Profile</h3>

              {/* Photo upload */}
              <div className="flex justify-center mb-6">
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <img
                      src={profile.photo || getInitialAvatarUrl(username)}
                      alt={username || "User"}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
                      <Camera size={16} className="text-white" />
                    </div>
                  </div>
                  <span className="text-accent text-xs">
                    {uploadingPhoto ? "Uploading..." : "Change Photo"}
                  </span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                </label>
              </div>

              <div className="mb-4 text-center">
                <p className="text-text-muted text-xs uppercase tracking-[0.15em] mb-1">Username</p>
                <p className="text-text text-sm">@{profile.username}</p>
                <p className="text-text-dim text-[10px] mt-1">Username can't be changed at this time</p>
              </div>

              <div className="mb-6">
                <p className="text-text-muted text-xs uppercase tracking-[0.15em] mb-2 text-center">Display Name</p>
                <input type="text" value={newDisplayName}
                  onChange={(e) => { setNewDisplayName(e.target.value); setEditError(''); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveProfile()}
                  placeholder="Leave empty to use username"
                  className={`w-full rounded-xl px-4 py-3.5 text-text placeholder-text-dim text-sm focus:outline-none border transition-colors text-center ${editError ? 'border-danger' : 'border-accent/12'}`}
                  style={{ background: "rgba(var(--rgb-surface), 0.6)" }}
                />
                {editError && <p className="text-danger text-xs text-center mt-2">{editError}</p>}
              </div>

              <div className="mb-4">
                <p className="text-text-muted text-xs uppercase tracking-[0.15em] mb-2 text-center">Bio</p>
                <textarea value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  placeholder="Tell people a bit about yourself..."
                  rows={2}
                  maxLength={150}
                  className="w-full rounded-xl px-4 py-3 text-text placeholder-text-dim text-sm focus:outline-none border border-accent/12 resize-none text-center"
                  style={{ background: "rgba(var(--rgb-surface), 0.6)" }}
                />
                <p className="text-text-dim text-[10px] text-right mt-1">{newBio.length}/150</p>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <p className="text-text-muted text-xs uppercase tracking-[0.15em]">Location</p>
                  <button
                    type="button"
                    onClick={() => { setUseAutoLocation(!useAutoLocation); if (!useAutoLocation) void requestLocation(); }}
                    className="relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0"
                    style={{ background: useAutoLocation ? "rgba(var(--rgb-accent), 0.35)" : "rgba(var(--rgb-accent), 0.12)" }}
                    aria-label="Auto-detect location"
                  >
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-md"
                      style={{ transform: useAutoLocation ? "translateX(18px)" : "translateX(2px)" }}
                    />
                  </button>
                </div>
                <p className="text-text-dim text-[10px] text-center mb-2">Toggle to auto-detect from your browser</p>
                {useAutoLocation ? (
                  geoLocation ? (
                    <div className="rounded-xl px-4 py-3 flex items-center gap-2 border border-accent/12 justify-center"
                      style={{ background: "rgba(var(--rgb-surface), 0.6)" }}
                    >
                      <span className="text-text text-sm">{geoLocation.city}, {geoLocation.country}</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-text-dim text-xs">
                        {geoLoading ? "Detecting..." : geoDenied ? "Location access denied" : "Location not available"}
                      </p>
                      {!geoLoading && !geoDenied && (
                        <button onClick={() => void requestLocation()} className="text-accent text-xs mt-1 cursor-pointer">Try again</button>
                      )}
                    </div>
                  )
                ) : (
                  <input type="text" value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. London, UK"
                    className="w-full rounded-xl px-4 py-3.5 text-text placeholder-text-dim text-sm focus:outline-none border border-accent/12 transition-colors text-center"
                    style={{ background: "rgba(var(--rgb-surface), 0.6)" }}
                  />
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setEditOpen(false)}
                  className="flex-1 py-3.5 rounded-full text-sm text-text-muted bg-accent/6 border border-accent/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button onClick={handleSaveProfile}
                  className="flex-1 py-3.5 rounded-full text-sm text-white bg-[linear-gradient(135deg,var(--rgb-accent),var(--rgb-accent-dark))] cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}