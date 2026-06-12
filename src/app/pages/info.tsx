import { useState } from "react";
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
    next: { bg: "rgba(124,143,255,0.12)", text: "#7c8fff", label: "Next" },
    planned: { bg: "rgba(167,139,250,0.12)", text: "#a78bfa", label: "Planned" },
    future: { bg: "rgba(110,231,183,0.1)", text: "#6ee7b7", label: "Future" },
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
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      const list = JSON.parse(localStorage.getItem("oratio_waitlist") || "[]") as string[];
      if (!list.includes(email)) {
        list.push(email);
        localStorage.setItem("oratio_waitlist", JSON.stringify(list));
      }
    } catch { /* ignore */ }
    setSubscribed(true);
  };

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ background: "#0A1A3A" }}
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
              <InfoIcon size={16} className="text-[#7c8fff]" />
              <h2 className="text-[#e2e4f0] font-heading text-sm font-light">
                Beta Notice
              </h2>
            </div>
            <div
              className="rounded-xl p-4 border"
              style={{
                background: "rgba(124,143,255,0.04)",
                borderColor: "rgba(124,143,255,0.08)",
              }}
            >
              <p className="text-[#d0d4e8] text-sm leading-relaxed mb-3">
                You&apos;re using the Oratio beta — a working version of the app built for real use. We&apos;re still improving, so things may evolve.
              </p>
              <ul className="space-y-2 text-[#6b7499] text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-[#7c8fff] mt-0.5">•</span>
                  <span>Data is stored in <strong className="text-[#8890b5]">this browser only</strong>. Sign in with email or Google to keep your prayers across devices.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#7c8fff] mt-0.5">•</span>
                  <span>Prayers shown in the feed include sample data alongside real user submissions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#7c8fff] mt-0.5">•</span>
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
              <Route size={16} className="text-[#7c8fff]" />
              <h2 className="text-[#e2e4f0] font-heading text-sm font-light">
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
                    background: "linear-gradient(160deg, rgba(17, 26, 58, 0.6), rgba(12, 18, 48, 0.4))",
                    border: "1px solid rgba(124,143,255,0.06)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(124,143,255,0.06)" }}
                  >
                    <item.icon size={14} className="text-[#8890b5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[#d0d4e8] text-sm">{item.label}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-[#6b7499] text-xs">{item.desc}</p>
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
              <Mail size={16} className="text-[#7c8fff]" />
              <h2 className="text-[#e2e4f0] font-heading text-sm font-light">
                Stay Updated
              </h2>
            </div>
            <div
              className="rounded-xl p-4 border"
              style={{
                background: "rgba(124,143,255,0.04)",
                borderColor: "rgba(124,143,255,0.08)",
              }}
            >
              <p className="text-[#d0d4e8] text-sm leading-relaxed mb-3">
                Oratio is growing. Get notified when we launch new features, release the native app, or have updates to share.
              </p>
              {subscribed ? (
                <p className="text-[#7c8fff] text-sm text-center py-2">You&apos;re on the list! 🙏</p>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="flex-1 rounded-xl px-4 py-2.5 text-[#e2e4f0] placeholder-[#4e5573] text-xs focus:outline-none border border-[rgba(124,143,255,0.12)]"
                    style={{ background: "rgba(15, 20, 50, 0.6)" }}
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs text-white cursor-pointer transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg, #7c8fff, #5a6fd6)" }}
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </motion.div>

          {/* ── Footer credit ── */}
          <p className="text-center text-[#3e4460] text-[10px] pb-4">
            Oratio Beta · Built with care
          </p>
        </div>
      </div>
    </div>
  );
}
