import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Globe, Heart, PenLine, MessageCircle, Bell } from "lucide-react";

export function Landing() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      const list = JSON.parse(localStorage.getItem("oratio_waitlist") || "[]") as string[];
      if (!list.includes(email)) {
        list.push(email);
        localStorage.setItem("oratio_waitlist", JSON.stringify(list));
      }
    } catch {
      // ignore
    }
    setSubscribed(true);
  };

  const features = [
    {
      icon: Globe,
      title: "Global Prayer Map",
      desc: "Watch prayers rise from every corner of the world. See the global church praying in real-time.",
    },
    {
      icon: Heart,
      title: "Pray for Others",
      desc: "Tap to pray for requests from around the world. Every prayer is counted and felt.",
    },
    {
      icon: MessageCircle,
      title: "Encourage & Connect",
      desc: "Leave a comment to let someone know you prayed. Real connection, real community.",
    },
    {
      icon: PenLine,
      title: "Share Your Heart",
      desc: "Submit your own prayer requests. Use #hashtags to help others find and pray for you.",
    },
  ];

  return (
    <div className="flex flex-col min-h-dvh w-full" style={{ background: "#0A1A3A" }}>
      {/* Ambient glow */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none opacity-20"
        style={{ background: "radial-gradient(circle, rgba(124, 143, 255, 0.3), transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl mx-auto px-6 pt-24 pb-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center mb-16"
        >
          <h1
            className="font-heading text-white mb-4"
            style={{ fontSize: "clamp(3.5rem, 10vw, 5rem)", fontWeight: 300, letterSpacing: "0.1em" }}
          >
            <span style={{ position: "relative", display: "inline-block" }}>
              O
              <svg
                width="10"
                height="16"
                viewBox="0 0 16 22"
                fill="none"
                style={{ position: "absolute", bottom: "0.15em", left: "100%", marginLeft: "2px" }}
              >
                <rect x="5.5" y="0" width="5" height="22" rx="2.5" fill="#7c8fff" opacity="0.8" />
                <rect x="0" y="5" width="16" height="5" rx="2.5" fill="#7c8fff" opacity="0.8" />
              </svg>
            </span>
            RATIO
          </h1>
          <p className="text-[#8890b5] text-lg md:text-xl mb-3 font-light tracking-[0.3em] uppercase">
            Pray Together. Anywhere.
          </p>
          <p className="text-[#6b7499] text-sm max-w-lg mx-auto mb-10 leading-relaxed">
            Oratio is a global Christian prayer platform connecting people through shared prayer.
            Coming soon to iOS and Android.
          </p>

          {/* App Store Badges */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <div
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full text-sm cursor-not-allowed opacity-70"
              style={{
                background: "rgba(124, 143, 255, 0.08)",
                border: "1px solid rgba(124, 143, 255, 0.15)",
                color: "#8890b5",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#8890b5">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span className="text-sm">App Store — Coming Soon</span>
            </div>
            <div
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full text-sm cursor-not-allowed opacity-70"
              style={{
                background: "rgba(124, 143, 255, 0.08)",
                border: "1px solid rgba(124, 143, 255, 0.15)",
                color: "#8890b5",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#8890b5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              </svg>
              <span className="text-sm">Google Play — Coming Soon</span>
            </div>
          </div>

          {/* Email sign-up */}
          <div className="w-full max-w-sm mx-auto">
            {subscribed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4 rounded-xl"
                style={{ background: "rgba(124,143,255,0.06)", border: "1px solid rgba(124,143,255,0.1)" }}
              >
                <p className="text-[#e2e4f0] text-sm font-medium mb-1">You're on the list!</p>
                <p className="text-[#6b7499] text-xs">We'll let you know when Oratio launches.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 rounded-xl px-4 py-3 text-[#e2e4f0] placeholder-[#4e5573] text-sm focus:outline-none border border-[rgba(124,143,255,0.12)]"
                  style={{ background: "rgba(15, 20, 50, 0.6)" }}
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl text-sm text-white cursor-pointer transition-all active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #7c8fff, #5a6fd6)",
                    boxShadow: "0 4px 20px rgba(124, 143, 255, 0.25)",
                  }}
                >
                  Notify Me
                </button>
              </form>
            )}
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="w-full mb-16"
        >
          <p className="text-[#8890b5] text-xs tracking-[0.25em] uppercase text-center mb-8">
            What to Expect
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
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
        </motion.div>

        {/* Phone mockup / screenshot placeholder */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="w-full max-w-sm mx-auto mb-16"
        >
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: "linear-gradient(180deg, rgba(17, 26, 58, 0.8), rgba(10, 18, 40, 0.6))",
              border: "1px solid rgba(124,143,255,0.08)",
            }}
          >
            <Bell size={24} className="text-[#7c8fff] mx-auto mb-3" />
            <p className="text-[#e2e4f0] text-sm font-medium mb-1">Coming Soon</p>
            <p className="text-[#6b7499] text-xs">
              Oratio is being built for iPhone and Android.
              <br />Join the waitlist to be the first to know.
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="w-full text-center border-t border-[rgba(124,143,255,0.06)] pt-8">
          <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
            <button
              onClick={() => void navigate("/info")}
              className="text-[#4e5573] hover:text-[#6b7499] text-xs transition-colors cursor-pointer"
            >
              About & Roadmap
            </button>
          </div>
          <p className="text-[#3e4460] text-[10px]">
            Oratio · A global Christian prayer platform
          </p>
        </div>
      </div>
    </div>
  );
}
