import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { LogIn, User } from "lucide-react";
import { loginProfile } from "../data/profile-data";

function getLastUser(): string {
  try {
    return localStorage.getItem("oratio_last_user") || "";
  } catch {
    return "";
  }
}

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [lastUser] = useState(getLastUser);

  const handleLogin = () => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      setError("Enter your username");
      return;
    }
    if (loginProfile(trimmed)) {
      void navigate("/feed");
    } else {
      setError("That username doesn't match your saved profile");
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full text-[#e8eaf6] relative overflow-hidden" style={{ background: "#0A1A3A" }}>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(124, 143, 255, 0.12), transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-col flex-1 justify-center px-6 max-w-sm mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <p className="text-[#7c8fff] text-xs tracking-[0.25em] uppercase mb-4">Welcome back</p>
          <h1 className="font-heading font-light tracking-[0.2em] text-white mb-3" style={{ fontSize: "2.2rem" }}>
            ORATIO
          </h1>
          {lastUser && (
            <p className="text-[#6b7499] text-sm flex items-center justify-center gap-1.5">
              <User size={13} className="text-[#5a6080]" />
              Last seen as <span className="text-[#8890b5]">@{lastUser}</span>
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.28 }}
          className="mb-8"
        >
          <p className="text-[#8890b5] text-sm text-center mb-6 leading-relaxed">
            Sign back in to your account. Your prayers, saved requests, and activity are waiting.
          </p>
          <p className="text-[#6b7499] text-xs uppercase tracking-[0.15em] mb-2.5 text-center">
            Enter your username
          </p>
          <input type="text" value={username}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder={lastUser || "your username"}
            autoFocus
            className="w-full rounded-xl px-4 py-3.5 text-[#e2e4f0] placeholder-[#4e5573] text-sm focus:outline-none border transition-colors text-center"
            style={{
              background: "rgba(15, 20, 50, 0.6)",
              borderColor: error ? '#ff6b6b' : 'rgba(124,143,255,0.12)',
            }}
          />
          {error && <p className="text-[#ff6b6b] text-xs text-center mt-2">{error}</p>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
        >
          <button onClick={handleLogin}
            className="w-full py-4 rounded-full text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #7c8fff, #5a6fd6)",
              color: "#ffffff",
              boxShadow: "0 4px 28px rgba(124, 143, 255, 0.3)",
            }}
          >
            <LogIn size={15} />
            Sign In
          </button>
        </motion.div>
      </div>
    </div>
  );
}
