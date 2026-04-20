import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Check, ChevronDown } from "lucide-react";
import { cities, getApproximateCoordinates } from "../data/prayer-data";
import { useNavigate } from "react-router";
import { validatePrayerSubmission, sanitizePrayerText } from "../../lib/validation";

interface OratioProfile {
  name?: string;
  icon?: string;
}

const CATEGORIES = ["Health", "Family", "Career", "Guidance", "Peace", "Other"];

// Coordinates are now generated via getApproximateCoordinates with privacy jitter

export function Submit() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [location, setLocation] = useState("London, United Kingdom");
  const [category, setCategory] = useState("Other");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get profile name from localStorage
  const profileName = (() => {
    try {
      const profile: OratioProfile = JSON.parse(localStorage.getItem("oratio_profile") || "{}") as OratioProfile;
      return profile.name || "";
    } catch {
      return "";
    }
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== SUBMISSION DEBUG ===');
    console.log('Form data:', { 
      textLength: text.length, 
      textSample: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
      location, 
      category,
      anonymous 
    });
    
    // Clear previous errors
    setErrors({});
    
    try {
    
    // Validate form data using Zod schema
    const validation = validatePrayerSubmission({
      text: text.trim(),
      location,
      category,
      anonymous,
    });
    
    console.log('Validation result:', validation);
    
    if (!validation.success) {
      // Show validation errors to user
      setErrors(validation.errors || {});
      console.log('Validation errors:', validation.errors);
      console.log('=== END DEBUG (validation failed) ===');
      return;
    }
    
    // If validation passes, proceed with submission

    // Create a new prayer and push it to the map via the window bridge
    const [cityName, countryName] = location.split(", ");
    const coords = getApproximateCoordinates(cityName, countryName);
    const displayName = anonymous ? undefined : (profileName || undefined);
    
    // Sanitize text for extra safety
    const sanitizedText = sanitizePrayerText(text.trim());
    console.log('Sanitized text:', sanitizedText);
    
    const newPrayer = {
      id: `new-${Date.now()}`,
      city: cityName || "Unknown",
      country: countryName || "Unknown",
      text: sanitizedText,
      name: displayName,
      prayerCount: 0,
      lat: coords.lat,
      lng: coords.lng,
      category,
      createdAt: new Date().toISOString(),
    };

    console.log('New prayer created:', newPrayer);
    console.log('Checking window bridge...');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    const hasBridge = typeof window !== "undefined" && (window as any).__oratio_addPrayer;
    console.log('Window bridge exists:', hasBridge);
    if (hasBridge) {
      console.log('Calling window.__oratio_addPrayer');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
      (window as any).__oratio_addPrayer(newPrayer);
      console.log('Window bridge called successfully');
    } else {
      console.warn('Window bridge not found! Prayer will only be saved to localStorage.');
      console.log('Possible reasons: Home component not mounted, or cross-page communication issue.');
    }

    // Track in localStorage for profile
    try {
      const existingIds = JSON.parse(localStorage.getItem("oratio_submitted") || "[]");
      console.log('Existing submitted IDs:', existingIds);
      localStorage.setItem("oratio_submitted", JSON.stringify([...existingIds, newPrayer.id]));
      // Also store the full prayer object so profile and feed can display it
      const existingPrayers = JSON.parse(localStorage.getItem("oratio_submitted_prayers") || "[]");
      console.log('Existing submitted prayers:', existingPrayers.length);
      localStorage.setItem("oratio_submitted_prayers", JSON.stringify([newPrayer, ...existingPrayers]));
      setSubmitted(true);
      console.log('Prayer saved to localStorage');
    } catch (e) {
      console.error('localStorage error:', e);
    }
  } catch (error) {
    console.error('Submission error:', error);
    return;
  }
  };

  const resetForm = () => {
    setText("");
    setAnonymous(false);
    setLocation("London, United Kingdom");
    setCategory("Other");
    setSubmitted(false);
  };

  return (
    <div
      className="w-full min-h-full flex flex-col items-center px-6 pt-24 pb-28 bg-background"
    >
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] h-[250px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(124, 143, 255, 0.04), transparent 70%)",
        }}
      />

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
              Share your need with believers around the world
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
                  placeholder="Share what you'd like others to pray for..."
                  rows={4}
                  className={`w-full rounded-xl px-4 py-3 text-[#e8eaf6] placeholder-[#5a5f80] resize-none border ${errors.text ? 'border-red-500/50 focus:border-red-500/70' : 'border-[rgba(124,143,255,0.12)] focus:border-[rgba(124,143,255,0.35)]'} focus:outline-none transition-colors text-sm`}
                  style={{
                    background: "rgba(15, 20, 50, 0.6)",
                    lineHeight: 1.7,
                  }}
                />
                {errors.text && (
                  <p className="text-red-400 text-xs mt-1 ml-1">{errors.text}</p>
                )}
              </div>

              {/* Anonymous toggle */}
              <div
                className="flex items-center justify-between rounded-xl px-4 py-3 border border-[rgba(124,143,255,0.12)]"
                style={{ background: "rgba(15, 20, 50, 0.6)" }}
              >
                <div>
                  <p className="text-[#e8eaf6] text-sm">
                    {anonymous ? "Submitting anonymously" : `Submitting as ${profileName || "yourself"}`}
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
                    className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
                    style={{
                      left: anonymous ? "0.125rem" : "calc(100% - 1.375rem)",
                      background: anonymous ? "#5a6080" : "#7c8fff",
                    }}
                  />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Location */}
                <div className="relative">
                  <label className="text-[#8890b5] text-sm mb-2 block">Location</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLocationDropdown(!showLocationDropdown);
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full rounded-xl px-4 py-3 text-left flex items-center justify-between border border-[rgba(124,143,255,0.12)] focus:border-[rgba(124,143,255,0.35)] focus:outline-none transition-colors text-sm cursor-pointer"
                    style={{ background: "rgba(15, 20, 50, 0.6)" }}
                  >
                    <span className={`truncate ${location ? "text-[#e8eaf6]" : "text-[#5a5f80]"}`}>
                      {location || "Select city"}
                    </span>
                    <ChevronDown size={16} className="text-[#8890b5] flex-shrink-0" />
                  </button>

                  <AnimatePresence>
                    {showLocationDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full mt-2 left-0 right-0 max-h-48 overflow-y-auto rounded-xl border border-[rgba(124,143,255,0.15)] z-20"
                        style={{
                          background: "rgba(15, 20, 55, 0.98)",
                          backdropFilter: "blur(20px)",
                        }}
                      >
                        {cities.map((city) => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => {
                              setLocation(city);
                              setShowLocationDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-[#c5cdff] hover:bg-[rgba(124,143,255,0.1)] transition-colors cursor-pointer truncate"
                          >
                            {city}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Category */}
                <div className="relative">
                  <label className="text-[#8890b5] text-sm mb-2 block">Category</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryDropdown(!showCategoryDropdown);
                      setShowLocationDropdown(false);
                    }}
                    className="w-full rounded-xl px-4 py-3 text-left flex items-center justify-between border border-[rgba(124,143,255,0.12)] focus:border-[rgba(124,143,255,0.35)] focus:outline-none transition-colors text-sm cursor-pointer"
                    style={{ background: "rgba(15, 20, 50, 0.6)" }}
                  >
                    <span className={`truncate ${category ? "text-[#e8eaf6]" : "text-[#5a5f80]"}`}>
                      {category || "Select type"}
                    </span>
                    <ChevronDown size={16} className="text-[#8890b5] flex-shrink-0" />
                  </button>

                  <AnimatePresence>
                    {showCategoryDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full mt-2 left-0 right-0 max-h-48 overflow-y-auto rounded-xl border border-[rgba(124,143,255,0.15)] z-20"
                        style={{
                          background: "rgba(15, 20, 55, 0.98)",
                          backdropFilter: "blur(20px)",
                        }}
                      >
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setCategory(cat);
                              setShowCategoryDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-[#c5cdff] hover:bg-[rgba(124,143,255,0.1)] transition-colors cursor-pointer"
                          >
                            {cat}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={!text.trim() || !location || !category}
                className="w-full py-3.5 mt-4 rounded-full text-sm flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:
                    text.trim() && location && category
                      ? "linear-gradient(135deg, #7c8fff, #5a6fd6)"
                      : "rgba(124, 143, 255, 0.15)",
                  color: text.trim() && location && category ? "#ffffff" : "#8890b5",
                  boxShadow:
                    text.trim() && location && category
                      ? "0 4px 25px rgba(124, 143, 255, 0.3)"
                      : "none",
                }}
              >
                <Send size={16} />
                Submit Prayer Request
              </button>
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
              Your prayer is now visible in the global feed
            </p>
            <p className="text-[#8890b5] text-sm mb-8">
              Believers around the world will be able to pray for you
            </p>

            <button
              onClick={() => {
                resetForm();
                navigate("/feed");
              }}
              className="px-8 py-3 rounded-full text-sm text-[#7c8fff] border border-[rgba(124,143,255,0.25)] hover:border-[rgba(124,143,255,0.5)] transition-all cursor-pointer"
            >
              View in Feed
            </button>

            <button
              onClick={resetForm}
              className="px-8 py-3 rounded-full text-sm text-[#6b7499] hover:text-[#8b96c0] transition-all cursor-pointer mt-2"
            >
              Submit Another Request
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}