import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Check, Share2, MapPin, RefreshCw, Loader } from "lucide-react";
import { countries, getApproximateCoordinates } from '../../services/prayer-data';
import type { PrayerRequest } from '../../services/prayer-data';
import { useNavigate } from "react-router";
import { validatePrayerSubmission, sanitizePrayerText } from "../../../lib/validation";
import { CrisisResources } from "../../components/crisis-resources";
import { useGeolocation } from '../../hooks/use-geolocation';
import { createPrayerRequest, getProfilePreferences } from '../../services/supabase-queries';
import { useAuth } from '../../hooks/auth-context';
import { logError } from "../../../lib/logger";
import { captureEvent } from "../../../lib/analytics";

export function Submit() {
  const navigate = useNavigate();
  const { location: geoLocation, loading: geoLoading, denied: geoDenied, requestLocation } = useGeolocation();
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [lastPrayerId, setLastPrayerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [useAutoLocation, setUseAutoLocation] = useState(true);

  const { user, profile } = useAuth();

  const getSubmissionCoordinates = () => {
    if (useAutoLocation && geoLocation) {
      return {
        lat: Math.round(geoLocation.lat * 10) / 10,
        lng: Math.round(geoLocation.lng * 10) / 10,
      };
    }

    const cityValue = city.trim();
    const countryValue = country.trim();
    if (cityValue || countryValue) {
      return getApproximateCoordinates(cityValue || "Unknown", countryValue || "Unknown");
    }

    return { lat: 0, lng: 0 };
  };

  // Load default comment preference from profile settings
  useEffect(() => {
    let active = true;

    const loadPreferences = async () => {
      if (!user) return;
      const prefs = await getProfilePreferences();
      if (active) setCommentsEnabled(prefs.comments_enabled_default);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      const validation = validatePrayerSubmission({
        text: text.trim(),
        location: "",
        category: undefined,
        anonymous,
      });

      if (!validation.success) {
        setErrors(validation.errors || {});
        return;
      }

      if (!user) {
        setErrors({ general: "Please sign in again before submitting a prayer." });
        return;
      }

      const sanitizedText = sanitizePrayerText(text.trim());
      const displayUsername = anonymous ? undefined : (profile?.username || user?.email || undefined);
      const displayNameVal = anonymous ? undefined : (profile?.display_name || undefined);

      const { lat, lng } = getSubmissionCoordinates();

      // Submit to Supabase
      const supabaseId = await createPrayerRequest({
        text: sanitizedText,
        city: city.trim() || "Unknown",
        country: country.trim() || "Unknown",
        lat,
        lng,
        name: displayNameVal,
        displayName: displayNameVal,
        username: displayUsername,
        prayerCount: 0,
        commentsEnabled,
      });

      if (!supabaseId) {
        setErrors({
          general: "We couldn't save this prayer. Please wait a moment and try again.",
        });
        return;
      }

      const newPrayer: PrayerRequest = {
        id: supabaseId,
        city: city.trim() || "Unknown",
        country: country.trim() || "Unknown",
        text: sanitizedText,
        name: displayNameVal,
        displayName: displayNameVal,
        username: displayUsername,
        prayerCount: 0,
        lat,
        lng,
        createdAt: new Date().toISOString(),
        commentsEnabled,
      };

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oratio-prayer-added", { detail: newPrayer }));
      }

      setLastPrayerId(newPrayer.id);
      captureEvent("prayer_submitted", { city: city.trim(), country: country.trim(), anonymous: !displayUsername });
      setSubmitted(true);
    } catch (error) {
      logError("submit prayer", error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setText("");
    setAnonymous(false);
    setErrors({});
    setSubmitted(false);
  };

  return (
    <div className="flex flex-col w-full h-full bg-background relative">
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] h-[250px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(var(--rgb-accent), 0.04), transparent 70%)",
        }}
      />
      <div className="flex-1 overflow-y-auto px-6 pt-24 pb-28 flex flex-col items-center">

      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <h2 className="text-text text-center mb-2 font-heading font-light text-2xl">
              Submit a Prayer Request
            </h2>
            <p className="text-text-muted text-sm text-center mb-8">
              What&apos;s on your heart today?
            </p>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
              {/* Prayer text */}
              <div>
                <label className="text-text-muted text-sm mb-2 block">
                  Prayer message
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Share what's on your heart... (use #hashtags to help others find your prayer)"
                  rows={4}
                  className={`w-full rounded-xl px-4 py-3 text-text placeholder-text-dim resize-none border ${errors.text ? 'border-red-500/50 focus:border-red-500/70' : 'border-accent/12 focus:border-accent/35'} focus:outline-none transition-colors text-sm`}
                  style={{
                    background: "rgba(var(--rgb-surface), 0.6)",
                    lineHeight: 1.7,
                  }}
                />
                <div className="flex justify-between mt-1">
                  {errors.text && (
                    <p className="text-red-400 text-xs ml-1">{errors.text}</p>
                  )}
                  <p className={`text-xs ml-auto ${text.length < 10 ? 'text-red-400' : 'text-text-dim'}`}>
                    {text.length}/500
                  </p>
                </div>
              </div>

              {/* Guidance text */}
              <p className="text-text-dim text-xs leading-relaxed text-center">
                You&apos;re welcome to share what&apos;s on your heart. You may want to avoid sharing personal information so you can receive prayer freely and safely.
              </p>

              {/* Location */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-text-muted text-sm">Your Location</label>
                  <button
                    type="button"
                    onClick={() => { setUseAutoLocation(!useAutoLocation); if (!useAutoLocation) { setCity(""); setCountry(""); void requestLocation(); } }}
                    className="relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0"
                    style={{
                      background: useAutoLocation ? "rgba(var(--rgb-accent), 0.35)" : "rgba(var(--rgb-accent), 0.12)",
                    }}
                    aria-label={useAutoLocation ? "Auto-detect on" : "Auto-detect off"}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-md"
                      style={{
                        transform: useAutoLocation ? "translateX(22px)" : "translateX(2px)",
                      }}
                    />
                  </button>
                </div>

                {useAutoLocation ? (
                  geoLocation ? (
                    <div
                      className="rounded-xl px-4 py-3 flex items-center gap-2 border border-accent/12"
                      style={{ background: "rgba(var(--rgb-surface), 0.6)" }}
                    >
                      <MapPin size={14} className="text-accent flex-shrink-0" />
                      <span className="text-text text-sm flex-1">
                        {city}, {country}
                      </span>
                      <button
                        type="button"
                        onClick={() => setUseAutoLocation(false)}
                        className="text-accent text-xs hover:text-accent transition-colors cursor-pointer flex-shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-text-dim text-xs">
                        <RefreshCw size={11} className={geoLoading ? "animate-spin" : ""} />
                        {geoLoading ? "Detecting your location..." : "Location not detected"}
                      </div>
                      {!geoLoading && !geoDenied && (
                        <button
                          type="button"
                          onClick={handleDetectLocation}
                          className="text-accent text-xs hover:text-accent transition-colors cursor-pointer"
                        >
                          Try detecting now
                        </button>
                      )}
                      {geoDenied && (
                        <p className="text-text-dim text-[10px]">Location access denied. Toggle off to enter manually.</p>
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
                      style={{ background: "rgba(var(--rgb-surface), 0.6)" }}
                    />
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="flex-1 min-w-0 rounded-xl px-4 py-3 text-text text-sm border border-accent/12 focus:border-accent/35 focus:outline-none transition-colors appearance-none cursor-pointer"
                      style={{ background: "rgba(var(--rgb-surface), 0.6)" }}
                    >
                      <option value="" className="bg-bg">Country</option>
                      {countries.map((c) => (
                        <option key={c} value={c} className="bg-bg">{c}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Anonymous toggle */}
              <div
                className="flex items-center justify-between rounded-xl px-4 py-3 border border-accent/12"
                style={{ background: "rgba(var(--rgb-surface), 0.6)" }}
              >
                <div>
                  <p className="text-text text-sm">
                     {anonymous ? "Submitting anonymously" : `Submitting as ${profile?.username || "yourself"}`}
                  </p>
                  <p className="text-text-dim text-xs mt-0.5">
                    {anonymous ? "Your name won't be shown" : "Your profile name will be shown"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAnonymous(!anonymous)}
                  className="relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0"
                  style={{
                    background: anonymous
                      ? "rgba(var(--rgb-accent), 0.12)"
                      : "rgba(var(--rgb-accent), 0.35)",
                  }}
                >
                  <div
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-md"
                    style={{
                      transform: anonymous ? "translateX(22px)" : "translateX(2px)",
                    }}
                  />
                </button>
              </div>

              {/* Allow comments toggle */}
              <div
                className="flex items-center justify-between rounded-xl px-4 py-3 border border-accent/12"
                style={{ background: "rgba(var(--rgb-surface), 0.6)" }}
              >
                <div>
                  <p className="text-text text-sm">
                    {commentsEnabled ? "Comments are on" : "Comments are off"}
                  </p>
                  <p className="text-text-dim text-xs mt-0.5">
                    {commentsEnabled ? "Others can leave encouragement" : "No one can comment on this prayer"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCommentsEnabled(!commentsEnabled)}
                  className="relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0"
                  style={{
                    background: commentsEnabled
                      ? "rgba(var(--rgb-accent), 0.35)"
                      : "rgba(var(--rgb-accent), 0.12)",
                  }}
                >
                  <div
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-md"
                    style={{
                      transform: commentsEnabled ? "translateX(22px)" : "translateX(2px)",
                    }}
                  />
                </button>
              </div>

              {/* Submit button */}
              {errors.general && (
                <p className="text-danger text-xs text-center leading-relaxed" role="alert">
                  {errors.general}
                </p>
              )}

              <button
                type="submit"
                disabled={!text.trim() || submitting}
                className="w-full py-3.5 mt-4 rounded-full text-sm flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: text.trim() && !submitting
                    ? "linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))"
                    : "rgba(var(--rgb-accent), 0.15)",
                  color: text.trim() && !submitting ? "rgb(var(--rgb-text))" : "rgb(var(--rgb-text-muted))",
                  boxShadow: text.trim() && !submitting
                    ? "0 4px 25px rgba(var(--rgb-accent), 0.3)"
                    : "none",
                }}
              >
                {submitting ? (
                  <Loader size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
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
              transition={{ delay: 0.2, type: "spring", damping: 15 }}
              className="w-20 h-20 mx-auto mb-8 rounded-full flex items-center justify-center"
              style={{
                background: "radial-gradient(circle, rgba(var(--rgb-accent), 0.2), rgba(var(--rgb-accent), 0.05))",
                boxShadow: "0 0 60px rgba(var(--rgb-accent), 0.15)",
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
              Your prayer is in the feed.
            </p>
            <p className="text-text-muted text-sm mb-8">
              People around the world will see it and pray.
            </p>

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => { resetForm(); void navigate("/feed"); }}
                className="px-8 py-3 rounded-full text-sm text-accent border border-accent/25 hover:border-accent/50 transition-all cursor-pointer"
              >
                View in Feed
              </button>

              {lastPrayerId && (
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
