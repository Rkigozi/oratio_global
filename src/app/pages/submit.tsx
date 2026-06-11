import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Check, Share2 } from "lucide-react";
import { PrayerRequest } from "../data/prayer-data";
import { useNavigate } from "react-router";
import { validatePrayerSubmission, sanitizePrayerText } from "../../lib/validation";
import { getProfile } from "../data/profile-data";
import { CrisisResources } from "../components/crisis-resources";

function saveLastPrayerId(id: string) {
  try {
    localStorage.setItem("oratio_last_prayer_location", JSON.stringify({ id, city: "", country: "" }));
  } catch { /* ignore */ }
}

export function Submit() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastPrayerId, setLastPrayerId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const profile = getProfile();

  const handleSubmit = (e: React.FormEvent) => {
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

      const displayName = anonymous ? undefined : profile.displayName || undefined;
      const username = anonymous ? undefined : profile.username || undefined;
      const sanitizedText = sanitizePrayerText(text.trim());

      const newPrayer: PrayerRequest = {
        id: `new-${Date.now()}`,
        city: "",
        country: "",
        text: sanitizedText,
        name: displayName,
        displayName,
        username,
        prayerCount: 0,
        lat: 0,
        lng: 0,
        category: "Other",
        createdAt: new Date().toISOString(),
      };

      const hasBridge = typeof window !== "undefined" && (window as typeof window & { __oratio_addPrayer?: (prayer: PrayerRequest) => void }).__oratio_addPrayer;

      if (hasBridge) {
        (window as typeof window & { __oratio_addPrayer?: (prayer: PrayerRequest) => void }).__oratio_addPrayer!(newPrayer);
      }

      try {
        const existingIds = JSON.parse(localStorage.getItem("oratio_submitted") || "[]") as string[];
        localStorage.setItem("oratio_submitted", JSON.stringify([...existingIds, newPrayer.id]));
        const existingPrayers = JSON.parse(localStorage.getItem("oratio_submitted_prayers") || "[]") as PrayerRequest[];
        localStorage.setItem("oratio_submitted_prayers", JSON.stringify([newPrayer, ...existingPrayers]));
        saveLastPrayerId(newPrayer.id);
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
    <div
      className="flex flex-col w-full bg-background relative overflow-hidden"
      style={{ height: "100dvh" }}
    >
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
