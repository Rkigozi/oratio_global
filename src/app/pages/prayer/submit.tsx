import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Check, Share2, MapPin, RefreshCw, Loader, Globe2, Users, Lock } from 'lucide-react';
import {
  countries,
  getApproximateCoordinates,
  normalizePrayerLocation,
} from '../../services/prayer-data';
import type { PrayerRequest } from '../../services/prayer-data';
import { useNavigate } from 'react-router';
import { validatePrayerSubmission, sanitizePrayerText } from '../../../lib/validation';
import { CrisisResources } from '../../components/crisis-resources';
import { useGeolocation } from '../../hooks/use-geolocation';
import {
  createPrayerRequest,
  getPrayerCircleCount,
  getProfilePreferences,
  type PrayerAudience,
} from '../../services/supabase-queries';
import { useAuth } from '../../hooks/auth-context';
import { logError } from '../../../lib/logger';
import { captureEvent } from '../../../lib/analytics';

export function Submit() {
  const navigate = useNavigate();
  const {
    location: geoLocation,
    loading: geoLoading,
    denied: geoDenied,
    requestLocation,
  } = useGeolocation();
  const [text, setText] = useState('');
  const [audience, setAudience] = useState<PrayerAudience>('public');
  const [circleCount, setCircleCount] = useState(0);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [lastPrayerId, setLastPrayerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [useAutoLocation, setUseAutoLocation] = useState(true);

  const { user, profile } = useAuth();
  const effectiveCommentsEnabled = audience === 'public' ? commentsEnabled : true;

  const getSubmissionLocation = () => {
    const cityValue = useAutoLocation && geoLocation ? geoLocation.city : city.trim();
    const countryValue = useAutoLocation && geoLocation ? geoLocation.country : country.trim();
    return normalizePrayerLocation(cityValue || 'Unknown', countryValue || 'Unknown');
  };

  const getSubmissionCoordinates = (submissionLocation: { city: string; country: string }) => {
    if (useAutoLocation && geoLocation) {
      return {
        lat: Math.round(geoLocation.lat * 10) / 10,
        lng: Math.round(geoLocation.lng * 10) / 10,
      };
    }

    if (submissionLocation.city !== 'Unknown' || submissionLocation.country !== 'Unknown') {
      return getApproximateCoordinates(submissionLocation.city, submissionLocation.country);
    }

    return { lat: 0, lng: 0 };
  };

  // Load default comment preference from profile settings
  useEffect(() => {
    let active = true;

    const loadPreferences = async () => {
      if (!user) return;
      const [prefs, count] = await Promise.all([
        getProfilePreferences(),
        getPrayerCircleCount(user.id),
      ]);
      if (active) setCommentsEnabled(prefs.comments_enabled_default);
      if (active) setCircleCount(count);
    };

    void loadPreferences();

    return () => {
      active = false;
    };
  }, [user]);

  // Auto-fill location from geolocation when it resolves
  useEffect(() => {
    if (geoLocation && useAutoLocation && !city && !country) {
      setCity(geoLocation.city);
      setCountry(geoLocation.country);
    }
  }, [geoLocation, useAutoLocation, city, country]);

  // Fall back to manual if geo was denied
  useEffect(() => {
    if (geoDenied) setUseAutoLocation(false);
  }, [geoDenied]);

  const handleDetectLocation = () => {
    void requestLocation();
  };

  const selectAudience = (nextAudience: PrayerAudience) => {
    if (nextAudience === 'circle' && circleCount < 1) return;
    setAudience(nextAudience);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      const validation = validatePrayerSubmission({
        text: text.trim(),
        location: '',
        category: undefined,
        anonymous: false,
      });

      if (!validation.success) {
        setErrors(validation.errors || {});
        return;
      }

      if (!user) {
        setErrors({ general: 'Please sign in again before submitting a prayer.' });
        return;
      }

      if (audience === 'circle' && circleCount < 1) {
        setErrors({
          general: 'Someone needs to accept your Prayer Circle invite before you can share there.',
        });
        return;
      }

      const sanitizedText = sanitizePrayerText(text.trim());
      const displayUsername = profile?.username || user.email || undefined;
      const displayNameVal = profile?.display_name || undefined;

      const submissionLocation = getSubmissionLocation();
      const { lat, lng } = getSubmissionCoordinates(submissionLocation);

      // Submit to Supabase
      const supabaseId = await createPrayerRequest({
        text: sanitizedText,
        city: submissionLocation.city,
        country: submissionLocation.country,
        lat,
        lng,
        name: displayNameVal,
        displayName: displayNameVal,
        username: displayUsername,
        audience,
        prayerCount: 0,
        commentsEnabled: effectiveCommentsEnabled,
      });

      if (!supabaseId) {
        setErrors({
          general: "We couldn't save this prayer. Please wait a moment and try again.",
        });
        return;
      }

      const newPrayer: PrayerRequest = {
        id: supabaseId,
        city: submissionLocation.city,
        country: submissionLocation.country,
        text: sanitizedText,
        authorId: user.id,
        name: displayNameVal,
        displayName: displayNameVal,
        username: displayUsername,
        audience,
        prayerCount: 0,
        lat,
        lng,
        createdAt: new Date().toISOString(),
        commentsEnabled: effectiveCommentsEnabled,
      };

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('oratio-prayer-added', { detail: newPrayer }));
      }

      setLastPrayerId(newPrayer.id);
      captureEvent('prayer_submitted', {
        city: submissionLocation.city,
        country: submissionLocation.country,
        anonymous: false,
        audience,
      });
      setSubmitted(true);
    } catch (error) {
      logError('submit prayer', error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setText('');
    setAudience('public');
    setErrors({});
    setSubmitted(false);
  };

  return (
    <div className="flex flex-col w-full h-full bg-background relative">
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] h-[250px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(var(--rgb-accent), 0.04), transparent 70%)',
        }}
      />
      <div className="flex-1 overflow-y-auto px-6 pt-20 pb-32 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <h2 className="text-text text-center mb-1.5 font-heading font-light text-xl">
                Submit a Prayer Request
              </h2>
              <p className="text-text-muted text-sm text-center mb-6">
                What&apos;s on your heart today?
              </p>

              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                {/* Prayer text */}
                <div>
                  <label className="oratio-section-label mb-2 block">Prayer</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Share what's on your heart..."
                    rows={4}
                    className={`w-full rounded-xl px-4 py-3 text-text placeholder-text-dim resize-none border ${errors.text ? 'border-red-500/50 focus:border-red-500/70' : 'border-text-faint/20 focus:border-text-muted/40'} focus:outline-none transition-colors text-sm`}
                    style={{
                      background: 'rgba(var(--rgb-surface), 0.6)',
                      lineHeight: 1.7,
                    }}
                  />
                  <div className="flex justify-between mt-1">
                    {errors.text && <p className="text-red-400 text-xs ml-1">{errors.text}</p>}
                    <p
                      className={`text-xs ml-auto ${
                        text.length > 0 && text.length < 10 ? 'text-red-400' : 'text-text-dim'
                      }`}
                    >
                      {text.length}/500
                    </p>
                  </div>
                </div>

                {/* Guidance text */}
                <p className="text-text-dim text-[11px] leading-relaxed text-center">
                  Share enough to be prayed for. Keep sensitive details private.
                </p>

                {/* Prayer visibility */}
                <div>
                  <label className="oratio-section-label mb-2 block">Visibility</label>
                  <div
                    className="grid grid-cols-1 gap-2 rounded-xl border border-text-faint/16 p-1"
                    style={{ background: 'rgba(var(--rgb-surface), 0.35)' }}
                  >
                    <button
                      type="button"
                      onClick={() => selectAudience('public')}
                      className="min-h-[70px] rounded-lg px-3 py-3 text-left transition-all cursor-pointer"
                      style={{
                        background:
                          audience === 'public' ? 'rgba(var(--rgb-text), 0.08)' : 'transparent',
                        border:
                          audience === 'public'
                            ? '1px solid rgba(var(--rgb-text-faint), 0.32)'
                            : '1px solid transparent',
                      }}
                    >
                      <span className="mb-2 flex items-center gap-1.5 text-text text-sm">
                        <Globe2 size={14} className="text-accent" />
                        Public
                      </span>
                      <span className="block text-text-dim text-[11px] leading-relaxed">
                        Appears in the public feed and map for signed-in people to pray.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectAudience('circle')}
                      disabled={circleCount < 1}
                      className="min-h-[70px] rounded-lg px-3 py-3 text-left transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-55"
                      style={{
                        background:
                          audience === 'circle' ? 'rgba(var(--rgb-text), 0.08)' : 'transparent',
                        border:
                          audience === 'circle'
                            ? '1px solid rgba(var(--rgb-text-faint), 0.32)'
                            : '1px solid transparent',
                      }}
                    >
                      <span className="mb-2 flex items-center gap-1.5 text-text text-sm">
                        <Users size={14} className="text-accent" />
                        Prayer Circle
                      </span>
                      <span className="block text-text-dim text-[11px] leading-relaxed">
                        Share with your Prayer Circle only. It stays off the public feed and map.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectAudience('private')}
                      className="min-h-[70px] rounded-lg px-3 py-3 text-left transition-all cursor-pointer"
                      style={{
                        background:
                          audience === 'private'
                            ? 'rgba(var(--rgb-text), 0.08)'
                            : 'transparent',
                        border:
                          audience === 'private'
                            ? '1px solid rgba(var(--rgb-text-faint), 0.32)'
                            : '1px solid transparent',
                      }}
                    >
                      <span className="mb-2 flex items-center gap-1.5 text-text text-sm">
                        <Lock size={14} className="text-accent" />
                        Private
                      </span>
                      <span className="block text-text-dim text-[11px] leading-relaxed">
                        Only you can see this. Save it for your own prayers, notes, and updates.
                      </span>
                    </button>
                  </div>
                  {audience === 'circle' && (
                    <p className="text-text-dim text-[11px] leading-relaxed mt-2">
                      Your name is shown on Prayer Circle requests.
                    </p>
                  )}
                  {audience === 'public' && circleCount < 1 && (
                    <p className="text-text-dim text-[11px] leading-relaxed mt-2">
                      Prayer Circle opens once someone accepts your invite. Until then, you can
                      share publicly or keep a prayer private.
                    </p>
                  )}
                  {audience === 'private' && (
                    <p className="text-text-dim text-[11px] leading-relaxed mt-2">
                      Only you can see this. Come back later to add notes, reflections, or updates.
                    </p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="oratio-section-label">Location</label>
                    <button
                      type="button"
                      onClick={() => {
                        setUseAutoLocation(!useAutoLocation);
                        if (!useAutoLocation) {
                          setCity('');
                          setCountry('');
                          void requestLocation();
                        }
                      }}
                      className="relative h-11 w-12 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0"
                      aria-label={useAutoLocation ? 'Auto-detect on' : 'Auto-detect off'}
                    >
                      <span
                        className="absolute left-0.5 top-1/2 h-6 w-11 -translate-y-1/2 rounded-full transition-colors duration-200"
                        style={{
                          background: useAutoLocation
                            ? 'rgba(var(--rgb-accent), 0.35)'
                            : 'rgba(var(--rgb-accent), 0.12)',
                        }}
                      />
                      <span
                        className="absolute left-1 top-1/2 h-5 w-5 rounded-full bg-white transition-transform duration-200 shadow-md"
                        style={{
                          transform: useAutoLocation
                            ? 'translate(22px, -50%)'
                            : 'translate(0, -50%)',
                        }}
                      />
                    </button>
                  </div>

                  {useAutoLocation ? (
                    geoLocation ? (
                      <div
                        className="rounded-xl px-4 py-3 flex items-center gap-2 border border-accent/12"
                        style={{ background: 'rgba(var(--rgb-surface), 0.6)' }}
                      >
                        <MapPin size={14} className="text-accent flex-shrink-0" />
                        <span className="text-text text-sm flex-1">
                          {city}, {country}
                        </span>
                        <button
                          type="button"
                          onClick={() => setUseAutoLocation(false)}
                          className="min-h-10 px-2 text-accent text-xs hover:text-accent transition-colors cursor-pointer flex-shrink-0"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-text-dim text-xs">
                          <RefreshCw size={11} className={geoLoading ? 'animate-spin' : ''} />
                          {geoLoading ? 'Detecting your location...' : 'Location not detected'}
                        </div>
                        {!geoLoading && !geoDenied && (
                          <button
                            type="button"
                            onClick={handleDetectLocation}
                            className="min-h-10 px-2 text-accent text-xs hover:text-accent transition-colors cursor-pointer"
                          >
                            Try detecting now
                          </button>
                        )}
                        {geoDenied && (
                          <p className="text-text-dim text-[10px]">
                            Location access denied. Toggle off to enter manually.
                          </p>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        className="flex-1 min-w-0 rounded-xl px-4 py-3 text-text placeholder-text-dim text-sm border border-accent/12 focus:border-accent/35 focus:outline-none transition-colors"
                        style={{ background: 'rgba(var(--rgb-surface), 0.6)' }}
                      />
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="flex-1 min-w-0 rounded-xl px-4 py-3 text-text text-sm border border-accent/12 focus:border-accent/35 focus:outline-none transition-colors appearance-none cursor-pointer"
                        style={{ background: 'rgba(var(--rgb-surface), 0.6)' }}
                      >
                        <option value="" className="bg-bg">
                          Country
                        </option>
                        {countries.map((c) => (
                          <option key={c} value={c} className="bg-bg">
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Public comments toggle */}
                {audience === 'public' && (
                  <div
                    className="flex items-center justify-between rounded-xl px-4 py-3 border border-accent/12"
                    style={{ background: 'rgba(var(--rgb-surface), 0.6)' }}
                  >
                    <div>
                      <p className="text-text text-sm">
                        {commentsEnabled ? 'Comments are on' : 'Comments are off'}
                      </p>
                      <p className="text-text-dim text-xs mt-0.5">
                        {commentsEnabled
                          ? 'Others can leave encouragement'
                          : 'No one can comment on this public prayer'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCommentsEnabled(!commentsEnabled)}
                      className="relative h-11 w-12 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0"
                      aria-label={commentsEnabled ? 'Turn comments off' : 'Turn comments on'}
                    >
                      <span
                        className="absolute left-0.5 top-1/2 h-6 w-11 -translate-y-1/2 rounded-full transition-colors duration-200"
                        style={{
                          background: commentsEnabled
                            ? 'rgba(var(--rgb-accent), 0.35)'
                            : 'rgba(var(--rgb-accent), 0.12)',
                        }}
                      />
                      <span
                        className="absolute left-1 top-1/2 h-5 w-5 rounded-full bg-white transition-transform duration-200 shadow-md"
                        style={{
                          transform: commentsEnabled
                            ? 'translate(22px, -50%)'
                            : 'translate(0, -50%)',
                        }}
                      />
                    </button>
                  </div>
                )}

                {/* Submit button */}
                {errors.general && (
                  <p className="text-danger text-xs text-center leading-relaxed" role="alert">
                    {errors.general}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!text.trim() || submitting}
                  className="oratio-primary-pill w-full min-h-12 py-3.5 mt-3 rounded-full text-sm flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer disabled:opacity-100 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                  Submit Prayer Request
                </button>

                <CrisisResources />
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md text-center pt-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                className="w-20 h-20 mx-auto mb-8 rounded-full flex items-center justify-center"
                style={{
                  background:
                    'radial-gradient(circle, rgba(var(--rgb-accent), 0.2), rgba(var(--rgb-accent), 0.05))',
                  boxShadow: '0 0 60px rgba(var(--rgb-accent), 0.15)',
                }}
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Check size={36} className="text-accent" />
                </motion.div>
              </motion.div>

              <h2 className="text-text mb-3 font-heading font-light text-2xl">
                Prayer Request Submitted
              </h2>
              <p className="text-text-muted text-sm mb-2">
                {audience === 'private'
                  ? 'Your prayer has been saved privately.'
                  : audience === 'circle'
                    ? 'Shared with your Prayer Circle.'
                    : 'Your prayer is in the feed.'}
              </p>
              <p className="text-text-muted text-sm mb-8">
                {audience === 'private'
                  ? 'Only you can see it. Come back later for notes or private thoughts.'
                  : audience === 'circle'
                    ? 'Your Prayer Circle can see it, pray, and leave encouragement.'
                    : 'People can find it in the feed, pray, and leave encouragement.'}
              </p>

              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => {
                    resetForm();
                    if (audience === 'private' && lastPrayerId) {
                      void navigate(`/prayer/${lastPrayerId}`);
                    } else {
                      void navigate(audience === 'circle' ? '/feed?circle=1' : '/feed');
                    }
                  }}
                  className="px-8 py-3 rounded-full text-sm text-accent border border-accent/25 hover:border-accent/50 transition-all cursor-pointer"
                >
                  {audience === 'private'
                    ? 'Open Private Prayer'
                    : audience === 'circle'
                      ? 'View Prayer Circle'
                      : 'View in Feed'}
                </button>

                {lastPrayerId && audience === 'public' && (
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/prayer/${lastPrayerId}`;
                      if (navigator.share) {
                        void navigator.share({ text: `Join me in prayer on Oratio: ${url}` });
                      } else {
                        void navigator.clipboard.writeText(url);
                      }
                    }}
                    className="flex items-center gap-1.5 text-text-dim hover:text-text-muted text-xs transition-colors cursor-pointer"
                  >
                    <Share2 size={11} />
                    Share prayer link
                  </button>
                )}

                <button
                  onClick={resetForm}
                  className="px-8 py-3 rounded-full text-sm text-text-muted hover:text-text-muted transition-all cursor-pointer"
                >
                  Submit Another Request
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
