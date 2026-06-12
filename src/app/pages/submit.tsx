import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Check, Share2, MapPin, RefreshCw } from "lucide-react";
import { PrayerRequest, countries } from "../data/prayer-data";
import { useNavigate } from "react-router";
import { validatePrayerSubmission, sanitizePrayerText } from "../../lib/validation";
import { getProfile } from "../data/profile-data";
import { CrisisResources } from "../components/crisis-resources";
import { useGeolocation } from "../../lib/use-geolocation";
import { createPrayerRequest } from "../../lib/supabase-queries";
import { useAuth } from "../../lib/auth-context";

function saveLastPrayerId(id: string, city: string, country: string) {
  try {
    localStorage.setItem("oratio_last_prayer_location", JSON.stringify({ id, city, country }));
  } catch { /* ignore */ }
}

export function Submit() {
  const navigate = useNavigate();
  const { location: geoLocation, loading: geoLoading, denied: geoDenied, requestLocation } = useGeolocation();
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastPrayerId, setLastPrayerId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [useAutoLocation, setUseAutoLocation] = useState(true);

  const { user } = useAuth();
  const profile = getProfile();

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

    try {
      const validation = validatePrayerSubmission({
        text: text.trim(),
        location: "",
        category: "Other",
        anonymous,
      });

      if (!validation.success) {
        setErrors(validation.errors || {});
        return;
      }

      const sanitizedText = sanitizePrayerText(text.trim());
      const displayUsername = anonymous ? undefined : (profile.username || user?.email);
      const displayNameVal = anonymous ? undefined : (profile.displayName || undefined);

      // Submit to Supabase
      let supabaseId: string | null = null;
      if (user) {
        supabaseId = await createPrayerRequest({
          text: sanitizedText,
          city: city.trim() || "Unknown",
          country: country.trim() || "Unknown",
          lat: geoLocation?.lat || 0,
          lng: geoLocation?.lng || 0,
          category: "Other",
          name: displayNameVal,
          displayName: displayNameVal,
          username: displayUsername,
          prayerCount: 0,
        });
      }

      const newPrayer: PrayerRequest = {
        id: supabaseId || `new-${Date.now()}`,
        city: city.trim() || "Unknown",
        country: country.trim() || "Unknown",
        text: sanitizedText,
        name: displayNameVal,
        displayName: displayNameVal,
        username: displayUsername,
        prayerCount: 0,
        lat: geoLocation?.lat || 0,
        lng: geoLocation?.lng || 0,
        category: "Other",
        createdAt: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oratio-prayer-added", { detail: newPrayer }));
      }

      try {
        const existingIds = JSON.parse(localStorage.getItem("oratio_submitted") || "[]") as string[];
        localStorage.setItem("oratio_submitted", JSON.stringify([...existingIds, newPrayer.id]));
        const existingPrayers = JSON.parse(localStorage.getItem("oratio_submitted_prayers") || "[]") as PrayerRequest[];
        localStorage.setItem("oratio_submitted_prayers", JSON.stringify([newPrayer, ...existingPrayers]));
        saveLastPrayerId(newPrayer.id, city.trim(), country.trim());
        setLastPrayerId(newPrayer.id);
        setSubmitted(true);
      } catch (e) {
        console.error('localStorage error:', e);
      }
    } catch (error) {
      console.error('Submission error:', error);
    }
  };

  const resetForm = () => {
    setText("");
    setAnonymous(false);
    setSubmitted(false);
  };

  return (
    <div className="flex flex-col w-full h-full bg-background relative">
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] h-[250px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(124, 143, 255, 0.04), transparent 70%)",
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
            <h2 className="text-[#e8eaf6] text-center mb-2 font-heading font-light text-2xl">
              Submit a Prayer Request
            </h2>
            <p className="text-[#8890b5] text-sm text-center mb-8">
              What&apos;s on your heart today?
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Prayer text */}
              <div>
                <label className="text-[#8890b5] text-sm mb-2 block">
                  Prayer message
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Share what's on your heart... (use #hashtags to help others find your prayer)"
                  rows={4}
                  className={`w-full rounded-xl px-4 py-3 text-[#e8eaf6] placeholder-[#5a5f80] resize-none border ${errors.text ? 'border-red-500/50 focus:border-red-500/70' : 'border-[rgba(124,143,255,0.12)] focus:border-[rgba(124,143,255,0.35)]'} focus:outline-none transition-colors text-sm`}
                  style={{
                    background: "rgba(15, 20, 50, 0.6)",
                    lineHeight: 1.7,
                  }}
                />
                <div className="flex justify-between mt-1">
                  {errors.text && (
                    <p className="text-red-400 text-xs ml-1">{errors.text}</p>
                  )}
                  <p className={`text-xs ml-auto ${text.length < 10 ? 'text-red-400' : 'text-[#5a5f80]'}`}>
                    {text.length}/500
                  </p>
                </div>
              </div>

              {/* Guidance text */}
              <p className="text-[#4e5573] text-xs leading-relaxed text-center">
                You&apos;re welcome to share what&apos;s on your heart. You may want to avoid sharing personal information so you can receive prayer freely and safely.
              </p>

              {/* Location */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[#8890b5] text-sm">Your Location</label>
                  <button
                    type="button"
                    onClick={() => { setUseAutoLocation(!useAutoLocation); if (!useAutoLocation) { setCity(""); setCountry(""); void requestLocation(); } }}
                    className="relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0"
                    style={{
                      background: useAutoLocation ? "rgba(124, 143, 255, 0.35)" : "rgba(124, 143, 255, 0.12)",
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
                      className="rounded-xl px-4 py-3 flex items-center gap-2 border border-[rgba(124,143,255,0.12)]"
                      style={{ background: "rgba(15, 20, 50, 0.6)" }}
                    >
                      <MapPin size={14} className="text-[#7c8fff] flex-shrink-0" />
                      <span className="text-[#e8eaf6] text-sm flex-1">
                        {city}, {country}
                      </span>
                      <button
                        type="button"
                        onClick={() => setUseAutoLocation(false)}
                        className="text-[#7c8fff] text-xs hover:text-[#a0b0ff] transition-colors cursor-pointer flex-shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[#4e5573] text-xs">
                        <RefreshCw size={11} className={geoLoading ? "animate-spin" : ""} />
                        {geoLoading ? "Detecting your location..." : "Location not detected"}
                      </div>
                      {!geoLoading && !geoDenied && (
                        <button
                          type="button"
                          onClick={handleDetectLocation}
                          className="text-[#7c8fff] text-xs hover:text-[#a0b0ff] transition-colors cursor-pointer"
                        >
                          Try detecting now
                        </button>
                      )}
                      {geoDenied && (
                        <p className="text-[#4e5573] text-[10px]">Location access denied. Toggle off to enter manually.</p>
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
                      className="flex-1 min-w-0 rounded-xl px-4 py-3 text-[#e8eaf6] placeholder-[#5a5f80] text-sm border border-[rgba(124,143,255,0.12)] focus:border-[rgba(124,143,255,0.35)] focus:outline-none transition-colors"
                      style={{ background: "rgba(15, 20, 50, 0.6)" }}
                    />
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="flex-1 min-w-0 rounded-xl px-4 py-3 text-[#e8eaf6] text-sm border border-[rgba(124,143,255,0.12)] focus:border-[rgba(124,143,255,0.35)] focus:outline-none transition-colors appearance-none cursor-pointer"
                      style={{ background: "rgba(15, 20, 50, 0.6)" }}
                    >
                      <option value="" className="bg-[#0A1A3A]">Country</option>
                      {countries.map((c) => (
                        <option key={c} value={c} className="bg-[#0A1A3A]">{c}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Anonymous toggle */}
              <div
                className="flex items-center justify-between rounded-xl px-4 py-3 border border-[rgba(124,143,255,0.12)]"
                style={{ background: "rgba(15, 20, 50, 0.6)" }}
              >
                <div>
                  <p className="text-[#e8eaf6] text-sm">
                     {anonymous ? "Submitting anonymously" : `Submitting as ${profile.username || "yourself"}`}
                  </p>
                  <p className="text-[#5a5f80] text-xs mt-0.5">
                    {anonymous ? "Your name won't be shown" : "Your profile name will be shown"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAnonymous(!anonymous)}
                  className="relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0"
                  style={{
                    background: anonymous
                      ? "rgba(124, 143, 255, 0.12)"
                      : "rgba(124, 143, 255, 0.35)",
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

              {/* Submit button */}
              <button
                type="submit"
                disabled={!text.trim()}
                className="w-full py-3.5 mt-4 rounded-full text-sm flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: text.trim()
                    ? "linear-gradient(135deg, #7c8fff, #5a6fd6)"
                    : "rgba(124, 143, 255, 0.15)",
                  color: text.trim() ? "#ffffff" : "#8890b5",
                  boxShadow: text.trim()
                    ? "0 4px 25px rgba(124, 143, 255, 0.3)"
                    : "none",
                }}
              >
                <Send size={16} />
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
                background: "radial-gradient(circle, rgba(124,143,255,0.2), rgba(124,143,255,0.05))",
                boxShadow: "0 0 60px rgba(124, 143, 255, 0.15)",
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Check size={36} className="text-[#7c8fff]" />
              </motion.div>
            </motion.div>

            <h2 className="text-[#e8eaf6] mb-3 font-heading font-light text-2xl">
              Prayer Request Submitted
            </h2>
            <p className="text-[#8890b5] text-sm mb-2">
              Your prayer is in the feed.
            </p>
            <p className="text-[#8890b5] text-sm mb-8">
              People around the world will see it and pray.
            </p>

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => { resetForm(); void navigate("/feed"); }}
                className="px-8 py-3 rounded-full text-sm text-[#7c8fff] border border-[rgba(124,143,255,0.25)] hover:border-[rgba(124,143,255,0.5)] transition-all cursor-pointer"
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
                  className="flex items-center gap-1.5 text-[#4e5573] hover:text-[#6b7499] text-xs transition-colors cursor-pointer"
                >
                  <Share2 size={11} />
                  Share prayer link
                </button>
              )}

              <button
                onClick={resetForm}
                className="px-8 py-3 rounded-full text-sm text-[#6b7499] hover:text-[#8b96c0] transition-all cursor-pointer"
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
