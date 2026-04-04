import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Check } from "lucide-react";

const AVATARS = ["🙏", "✝️", "🕊️", "💛", "🌿", "⭐", "🔥", "💜"];

function saveProfile(name: string, avatar: string) {
  localStorage.setItem(
    "oratio_profile",
    JSON.stringify({ name, avatar, joinedAt: new Date().toISOString() })
  );
}

export function Onboarding() {
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState("🙏");
  const [name, setName] = useState("");

  const handleBegin = () => {
    saveProfile(name.trim() || "Anonymous", avatar);
    navigate("/");
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
            Who's praying today?
          </p>
        </motion.div>

        {/* Avatar picker */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mb-8"
        >
          <p className="text-[#6b7499] text-xs uppercase tracking-[0.15em] mb-3 text-center">
            Choose your icon
          </p>
          <div className="flex gap-2.5 flex-wrap justify-center">
            {AVATARS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setAvatar(emoji)}
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl cursor-pointer transition-all duration-200"
                style={{
                  background:
                    avatar === emoji
                      ? "rgba(124,143,255,0.15)"
                      : "rgba(17, 26, 58, 0.6)",
                  border:
                    avatar === emoji
                      ? "1px solid rgba(124,143,255,0.35)"
                      : "1px solid rgba(124,143,255,0.08)",
                  transform: avatar === emoji ? "scale(1.12)" : "scale(1)",
                  boxShadow:
                    avatar === emoji
                      ? "0 0 16px rgba(124,143,255,0.15)"
                      : "none",
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Name input */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.28 }}
          className="mb-8"
        >
          <p className="text-[#6b7499] text-xs uppercase tracking-[0.15em] mb-2.5 text-center">
            Your name
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBegin()}
            placeholder="How should others see you?"
            autoFocus
            className="w-full rounded-xl px-4 py-3.5 text-[#e2e4f0] placeholder-[#4e5573] text-sm focus:outline-none border border-[rgba(124,143,255,0.12)] focus:border-[rgba(124,143,255,0.3)] transition-colors text-center"
            style={{ background: "rgba(15, 20, 50, 0.6)" }}
          />
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
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
