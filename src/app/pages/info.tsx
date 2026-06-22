import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Info as InfoIcon,
  Route,
  Shield,
  Globe,
  Bell,
  Users,
  LogIn,
  Mail,
} from "lucide-react";
import { subscribeToWaitlist } from "../../lib/supabase-queries";

const roadmapItems = [
  {
    icon: Users,
    label: "Community Profiles",
    desc: "Bios, locations, follower lists, and mutual connections — build your prayer community.",
    status: "next" as const,
  },
  {
    icon: LogIn,
    label: "Cross-Device Accounts",
    desc: "Sign in across devices with Supabase auth — no more localStorage boundaries.",
    status: "planned" as const,
  },
  {
    icon: Bell,
    label: "Push Notifications",
    desc: "Get notified when someone prays for or comments on your prayer.",
    status: "planned" as const,
  },
  {
    icon: Shield,
    label: "Moderation & Safety",
    desc: "Better reporting tools, content moderation, and safety features.",
    status: "planned" as const,
  },
  {
    icon: Globe,
    label: "Native Mobile App",
    desc: "Oratio for iOS and Android — the full experience as a real installed app.",
    status: "future" as const,
  },
];
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    next: { bg: "rgba(var(--rgb-accent), 0.12)", text: "rgb(var(--rgb-accent))", label: "Next" },
    planned: { bg: "rgba(167,139,250,0.12)", text: "#a78bfa", label: "Planned" },
    future: { bg: "rgba(var(--rgb-success), 0.1)", text: "rgb(var(--rgb-success))", label: "Future" },
  };
  const s = styles[status] || styles.planned;
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.bg}` }}
    >
      {s.label}
    </span>
  );
}

export function Info() {
  const navigate = useNavigate();
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const result = await subscribeToWaitlist(email, "info");
    if (result === "error") return;
    setSubscribed(true);
  };

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ background: "rgb(var(--rgb-bg))" }}
    >
      <div className="flex-1 px-4 pb-28 overflow-y-auto pt-24">
        <div className="max-w-md mx-auto space-y-8">

          {/* ── Beta notice ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <InfoIcon size={16} className="text-accent" />
              <h2 className="text-text font-heading text-sm font-light">
                Beta Notice
              </h2>
            </div>
            <div
              className="rounded-xl p-4 border"
              style={{
                background: "rgba(var(--rgb-accent), 0.04)",
                borderColor: "rgba(var(--rgb-accent), 0.08)",
              }}
            >
              <p className="text-text-secondary text-sm leading-relaxed mb-3">
                You&apos;re using the Oratio beta — a working version of the app built for real use. We&apos;re still improving, so things may evolve.
              </p>
              <ul className="space-y-2 text-text-muted text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span>Data is stored in <strong className="text-text-muted">this browser only</strong>. Sign in with email or Google to keep your prayers across devices.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span>All prayers in the feed are from real users. Your prayer joins the global community.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span>Your feedback shapes what comes next — share it with us.</span>
                </li>
              </ul>
            </div>
          </motion.div>



          {/* ── Roadmap ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Route size={16} className="text-accent" />
              <h2 className="text-text font-heading text-sm font-light">
                What&apos;s Coming Next
              </h2>
            </div>
            <div className="space-y-2.5">
              {roadmapItems.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.05, duration: 0.35 }}
                  className="rounded-xl px-4 py-3.5 flex items-start gap-3"
                  style={{
                    background: "linear-gradient(160deg, rgba(var(--rgb-surface), 0.6), rgba(var(--rgb-surface), 0.4))",
                    border: "1px solid rgba(var(--rgb-accent), 0.06)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(var(--rgb-accent), 0.06)" }}
                  >
                    <item.icon size={14} className="text-text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-text-secondary text-sm">{item.label}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-text-muted text-xs">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>



          {/* ── Stay Updated ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Mail size={16} className="text-accent" />
              <h2 className="text-text font-heading text-sm font-light">
                Stay Updated
              </h2>
            </div>
            <div
              className="rounded-xl p-4 border"
              style={{
                background: "rgba(var(--rgb-accent), 0.04)",
                borderColor: "rgba(var(--rgb-accent), 0.08)",
              }}
            >
               <p className="text-text-secondary text-sm leading-relaxed mb-3">
                We'll save your interest locally — real email subscription coming with accounts.
              </p>
              {subscribed ? (
                <div className="text-center">
                  <p className="text-accent text-sm py-2">You're on the list! 🙏</p>
                  <button
                    onClick={() => { setSubscribed(false); setEmail(""); }}
                    className="text-text-dim text-[10px] hover:text-text-muted transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="flex-1 min-w-0 rounded-xl px-4 py-2.5 text-text placeholder-text-dim text-xs focus:outline-none border border-accent/12"
                    style={{ background: "rgba(var(--rgb-surface), 0.6)" }}
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs text-white cursor-pointer transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))" }}
                  >
                    Save
                  </button>
                </form>
              )}
            </div>
          </motion.div>

          {/* ── Footer links ── */}
          <div className="flex items-center justify-center gap-4 pb-2">
            <button
              onClick={() => void navigate("/privacy")}
              className="text-text-dim hover:text-text-muted text-[10px] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-text-faint text-[10px]">·</span>
            <button
              onClick={() => void navigate("/terms")}
              className="text-text-dim hover:text-text-muted text-[10px] transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
          <p className="text-center text-text-faint text-[10px] pb-4">
            Oratio Beta · Built with care
          </p>
        </div>
      </div>
    </div>
  );
}
