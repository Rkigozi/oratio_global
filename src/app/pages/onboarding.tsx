import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { saveProfile, clearUsedUsernames, markUsernameUsed } from "../data/profile-data";
import { validateProfile } from "../../lib/validation";



export function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Clear used usernames if query param present (for testing)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('clearUsernames') === 'true') {
      clearUsedUsernames();
      console.log('Cleared used usernames');
    }
  }, [location.search]);

  // Check if username is available (local storage only)
  const isUsernameAvailable = (testUsername: string): boolean => {
    try {
      const used = JSON.parse(localStorage.getItem('oratio_usernames') || '[]') as string[];
      return !used.includes(testUsername.toLowerCase());
    } catch {
      return true;
    }
  };

  const sanitizeUsernameInput = (input: string) => {
    let sanitized = input.toLowerCase();
    sanitized = sanitized.replace(/[^a-z0-9_]/g, '_');
    sanitized = sanitized.replace(/_+/g, '_');
    sanitized = sanitized.replace(/^_+|_+$/g, '');
    return sanitized.slice(0, 30);
  };

  const handleBegin = () => {
    setErrors({});
    
    const sanitizedUsername = sanitizeUsernameInput(username.trim());
    
    // Validate with schema (displayName empty initially)
    const validation = validateProfile({
      username: sanitizedUsername,
      displayName: '',
    });
    
    if (!validation.success) {
      setErrors(validation.errors || {});
      return;
    }
    
    // Check username uniqueness (local storage only)
    if (!isUsernameAvailable(sanitizedUsername)) {
      setErrors({ username: 'This username is already taken' });
      return;
    }
    
    // Save profile
    const profile = {
      username: sanitizedUsername,
      displayName: '',
      avatar: "🙏",
      joinedAt: new Date().toISOString(),
    };
    
    saveProfile(profile);
    markUsernameUsed(sanitizedUsername);
    void navigate("/");
  };

  return (
    <div
      className="flex flex-col min-h-screen w-full text-[#e8eaf6] relative overflow-hidden"
      style={{ background: "#0A1A3A" }}
    >
      {/* Background glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(124, 143, 255, 0.12), transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col flex-1 justify-center px-8 max-w-sm mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <p className="text-[#7c8fff] text-xs tracking-[0.25em] uppercase mb-4">
            Welcome to
          </p>
          <h1 className="font-heading font-light tracking-[0.2em] text-white mb-3" style={{ fontSize: "2.2rem" }}>
            ORATIO
          </h1>
          <p className="text-[#6b7499] text-sm">
             Who&apos;s praying today?
          </p>
        </motion.div>



        {/* Username input (required) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.28 }}
          className="mb-8"
        >
          <p className="text-[#6b7499] text-xs uppercase tracking-[0.15em] mb-2.5 text-center">
            Choose a username
          </p>
           <input
             type="text"
             value={username}
              onChange={(e) => {
                setUsername(e.target.value);
              }}
             onBlur={() => {
               const sanitized = sanitizeUsernameInput(username);
               setUsername(sanitized);
             }}
             onKeyDown={(e) => e.key === "Enter" && handleBegin()}
              placeholder="e.g., prayer_warrior"
             autoFocus
             className="w-full rounded-xl px-4 py-3.5 text-[#e2e4f0] placeholder-[#4e5573] text-sm focus:outline-none border border-[rgba(124,143,255,0.12)] focus:border-[rgba(124,143,255,0.3)] transition-colors text-center"
             style={{ 
               background: "rgba(15, 20, 50, 0.6)",
               borderColor: errors.username ? '#ff6b6b' : 'rgba(124,143,255,0.12)'
             }}
           />
           {errors.username && (
             <p className="text-[#ff6b6b] text-xs text-center mt-2">
               {errors.username}
             </p>
           )}
           <p className="text-[#4e5573] text-xs text-center mt-2">
             Your unique handle.
           </p>
        </motion.div>



        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
        >
          <button
            onClick={handleBegin}
            className="w-full py-4 rounded-full text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #7c8fff, #5a6fd6)",
              color: "#ffffff",
              boxShadow:
                "0 4px 28px rgba(124, 143, 255, 0.3), 0 0 0 1px rgba(124,143,255,0.1)",
            }}
          >
            <Check size={15} />
            Begin Praying
          </button>
        </motion.div>
      </div>
    </div>
  );
}
