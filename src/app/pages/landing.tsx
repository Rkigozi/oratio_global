import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Globe, Heart, MessageCircle, ArrowRight, Mail } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { subscribeToWaitlist } from "../../lib/supabase-queries";
import { BetaBadge } from "../components/beta-badge";
import { BETA } from "../config";

export function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Redirect to feed if already signed in
  useEffect(() => {
    if (!loading && user) {
      void navigate("/feed", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const result = await subscribeToWaitlist(email, "landing");
    if (result === "error") return;
    setSubscribed(true);
  };

  const features = [
    {
      icon: Globe,
      title: "Global Prayer Map",
      desc: "See prayers rising from every corner of the world. You are part of something bigger.",
    },
    {
      icon: Heart,
      title: "Pray for One Another",
      desc: "A single tap sends a ripple of faith. Pray for requests from around the world.",
    },
    {
      icon: MessageCircle,
      title: "Encourage & Connect",
      desc: "Leave a comment, follow someone's journey, build real community through prayer.",
    },
  ];

  return (
    <div className="flex flex-col min-h-dvh w-full overflow-y-auto" style={{ background: "rgb(var(--rgb-bg))" }}>
      {/* Ambient glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[200px] pointer-events-none opacity-15"
        style={{ background: "radial-gradient(circle, rgba(var(--rgb-accent), 0.4), transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl mx-auto px-6 pt-20 pb-32">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <h1 className="font-heading text-text-secondary" style={{ fontSize: "clamp(3rem, 8vw, 4.5rem)", fontWeight: 300, letterSpacing: "0.08em" }}>
              ORATIO
            </h1>
            <BetaBadge className="mt-2" />
          </div>
          <p className="text-text-muted text-base md:text-lg mb-2 font-light tracking-[0.3em] uppercase">
            Pray Together. Anywhere.
          </p>
          <p className="text-text-dim text-sm max-w-md mx-auto mb-10 leading-relaxed">
            A global Christian prayer platform. Share your needs, pray for others, and experience the power of a worldwide prayer community.
          </p>

          {/* App Store badges */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm opacity-80"
              style={{ background: "rgba(var(--rgb-bg), 0.3)", border: "1px solid rgba(var(--rgb-text), 0.1)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#8890b5"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              <span className="text-text-muted text-sm">iOS — Coming Soon</span>
            </div>
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm opacity-80"
              style={{ background: "rgba(var(--rgb-bg), 0.3)", border: "1px solid rgba(var(--rgb-text), 0.1)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#8890b5">
                <path d="M4.08 2.23a1.5 1.5 0 0 0-.08.52v18.5a1.5 1.5 0 0 0 2.3 1.28l15.22-9.24a1.5 1.5 0 0 0 0-2.58L6.3 1.45a1.5 1.5 0 0 0-2.22.78z"/>
              </svg>
              <span className="text-text-muted text-sm">Android — Coming Soon</span>
            </div>
          </div>

          {/* Email waitlist */}
          <div className="w-full max-w-sm mx-auto">
            <p className="text-text-dim text-xs mb-3 text-center">Get notified when Oratio launches — we'll never spam you.</p>
            {subscribed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <p className="text-accent text-sm py-3 text-center">You're on the list! 🙏</p>
                <button
                  onClick={() => { setSubscribed(false); setEmail(""); }}
                  className="text-text-dim text-[10px] hover:text-text-muted transition-colors cursor-pointer block mx-auto"
                >
                  Remove
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 min-w-0 rounded-xl px-4 py-3 text-text placeholder-text-dim text-sm focus:outline-none border border-accent/12"
                  style={{ background: "rgba(var(--rgb-surface), 0.6)" }}
                />
                <button type="submit"
                  className="px-5 py-3 rounded-xl text-sm text-white cursor-pointer transition-all active:scale-95 flex items-center gap-2"
                  style={{ background: "linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))" }}
                >
                  <Mail size={14} />
                  Save
                </button>
              </form>
            )}
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full max-w-2xl mx-auto mb-16"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                className="rounded-xl px-5 py-5 text-center"
                style={{
                  background: "linear-gradient(160deg, rgba(var(--rgb-surface), 0.6), rgba(var(--rgb-surface), 0.4))",
                  border: "1px solid rgba(var(--rgb-accent), 0.06)",
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(var(--rgb-accent), 0.08)" }}
                >
                  <feature.icon size={16} className="text-accent" />
                </div>
                <h3 className="text-text-secondary text-sm font-medium mb-1.5">{feature.title}</h3>
                <p className="text-text-muted text-xs leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Sign in CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-center"
        >
          <button
            onClick={() => void navigate("/onboarding")}
            className="px-8 py-3.5 rounded-full text-sm font-medium text-white cursor-pointer transition-all active:scale-95 mb-5"
            style={{
              background: "linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))",
              boxShadow: "0 4px 28px rgba(var(--rgb-accent), 0.3)",
            }}
          >
            Create Account
          </button>
          <p className="text-text-dim text-xs mb-3">Already have an account?</p>
          <button
            onClick={() => void navigate("/login")}
            className="inline-flex items-center gap-2 text-accent text-sm hover:text-accent transition-colors cursor-pointer"
          >
            Sign in
            <ArrowRight size={14} />
          </button>
        </motion.div>

        {/* Footer */}
        <div className="w-full text-center mt-16 pt-6 border-t border-accent/6 space-y-2">
          {BETA.isBeta && (
            <p className="text-text-dim text-[11px] font-light italic">
              {BETA.notice}
            </p>
          )}
          <p className="text-text-faint text-[10px]">
            Oratio · A global Christian prayer platform
          </p>
        </div>
      </div>
    </div>
  );
}
