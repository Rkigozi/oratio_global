import { useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Globe, Heart, PenLine } from "lucide-react";
import { supabase } from "../../lib/supabase";

const features = [
  {
    icon: Globe,
    title: "Prayer Without Borders",
    desc: "Watch prayers rise from every corner of the world. You are part of something bigger.",
  },
  {
    icon: PenLine,
    title: "Share Your Heart",
    desc: "Every prayer you share invites others to stand with you. You don't have to carry it alone.",
  },
  {
    icon: Heart,
    title: "Pray for One Another",
    desc: "A single tap sends a ripple of faith. Your prayers matter more than you know.",
  },
];

export function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          void navigate("/", { replace: true });
        }
      } catch {
        // Supabase not configured
      }
    };
    void check();
  }, [navigate]);

  const handleSignIn = () => {
    void navigate("/login");
  };

  const handleStart = () => {
    void navigate("/onboarding");
  };

  return (
    <div
      className="flex flex-col h-dvh w-full text-[#e8eaf6] relative overflow-hidden"
      style={{ background: "#0A1A3A" }}
    >
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none opacity-30"
        style={{ background: "radial-gradient(circle, rgba(124, 143, 255, 0.3), transparent 70%)" }}
      />

      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center w-full max-w-lg mx-auto px-6 pt-20 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {/* Hero */}
        <div className="flex flex-col items-center w-full mb-14">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="mb-8"
            style={{ position: "relative", display: "inline-block" }}
          >
            <h1
              className="font-heading"
              style={{
                fontSize: "clamp(4.5rem, 15vw, 6rem)",
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

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-[#6b7499] text-sm tracking-[0.25em] uppercase mb-3"
          >
            Beta
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="font-heading font-light text-center text-white"
            style={{ fontSize: "1.8rem", letterSpacing: "0.06em" }}
          >
            Pray together.
            <br />
            Anywhere.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="text-[#6b7499] text-sm text-center max-w-xs mt-4 leading-relaxed"
          >
            Oratio connects people around the world through prayer. Share your needs. Pray for others. You&apos;re not alone.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="mt-10 w-full max-w-xs space-y-3"
          >
            <button
              onClick={handleStart}
              className="w-full py-4 rounded-full text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #7c8fff, #5a6fd6)",
                color: "#ffffff",
                boxShadow: "0 4px 28px rgba(124, 143, 255, 0.3), 0 0 0 1px rgba(124,143,255,0.1)",
              }}
            >
              Start Praying
            </button>
            <button
              onClick={handleSignIn}
              className="w-full py-3.5 rounded-full text-sm cursor-pointer transition-all duration-300 active:scale-95"
              style={{
                background: "rgba(124, 143, 255, 0.06)",
                color: "#6b7499",
                border: "1px solid rgba(124,143,255,0.1)",
              }}
            >
              I already have an account
            </button>
          </motion.div>
        </div>

        {/* Feature Cards */}
        <div className="w-full space-y-4 pb-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="rounded-xl px-5 py-4 flex items-start gap-4"
              style={{
                background: "linear-gradient(160deg, rgba(17, 26, 58, 0.6), rgba(12, 18, 48, 0.4))",
                border: "1px solid rgba(124,143,255,0.06)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "rgba(124,143,255,0.08)" }}
              >
                <feature.icon size={16} className="text-[#7c8fff]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[#d0d4e8] text-sm font-medium mb-1">{feature.title}</h3>
                <p className="text-[#6b7499] text-xs leading-relaxed">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Beta Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-full pb-6"
        >
          <div
            className="rounded-xl p-4 border text-center"
            style={{
              background: "rgba(124,143,255,0.04)",
              borderColor: "rgba(124,143,255,0.08)",
            }}
          >
            <p className="text-[#6b7499] text-xs leading-relaxed">
              This is an early prototype. Your prayers and activity stay on this device — nothing is shared or stored anywhere else.
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-[#3e4460] text-[10px] pb-2">
          Prototype · Your data stays on this device
        </p>
        </div>
      </div>
    </div>
  );
}
