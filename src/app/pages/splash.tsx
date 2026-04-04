import { useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";

export function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      const profile = localStorage.getItem("oratio_profile");
      const hasProfile = profile ? JSON.parse(profile)?.name : false;
      navigate(hasProfile ? "/" : "/onboarding");
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full text-[#e8eaf6] relative overflow-hidden" style={{ background: "#0A1A3A" }}>
      {/* Subtle background glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-[80px] pointer-events-none opacity-50"
        style={{ background: "radial-gradient(circle, rgba(124, 143, 255, 0.4), transparent 70%)" }}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="z-10"
        style={{ position: "relative", display: "inline-block" }}
      >
        <h1
          className="font-heading"
          style={{
            fontSize: "6rem",
            fontWeight: 300,
            color: "#d8ddef",
            letterSpacing: "0.15em",
            lineHeight: 1,
            margin: 0,
            padding: 0,
            display: "inline-block",
          }}
        >
          O
        </h1>
        {/* Mini cross in place of the period - positioned where a period would be */}
        <svg
          width="14"
          height="20"
          viewBox="0 0 16 22"
          fill="none"
          style={{
            position: "absolute",
            bottom: 0,
            left: "100%",
            marginLeft: "2px",
            filter: "drop-shadow(0 0 8px rgba(180,195,240,0.6))",
          }}
        >
          <rect x="5.5" y="0" width="5" height="22" rx="2.5" fill="#b0bce0" fillOpacity="0.85" />
          <rect x="0" y="5" width="16" height="5" rx="2.5" fill="#b0bce0" fillOpacity="0.85" />
        </svg>
      </motion.div>
    </div>
  );
}