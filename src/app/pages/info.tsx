import { motion } from "motion/react";
import {
  Info as InfoIcon,
  Route,
  GitCommit,
  Shield,
  Globe,
  Bell,
  Users,
  LogIn,
  Smartphone,
} from "lucide-react";

const roadmapItems = [
  {
    icon: LogIn,
    label: "Proper Accounts",
    desc: "Sign in across devices — no more localStorage boundaries",
    status: "next" as const,
  },
  {
    icon: Bell,
    label: "Push Notifications",
    desc: "Get notified when someone prays for your request",
    status: "planned" as const,
  },
  {
    icon: Globe,
    label: "Real Prayer Map",
    desc: "Live prayer activity from real users around the world",
    status: "planned" as const,
  },
  {
    icon: Shield,
    label: "Moderation Tools",
    desc: "Guided submission, crisis resources, better reporting",
    status: "planned" as const,
  },
  {
    icon: Users,
    label: "Community Features",
    desc: "Follow users, discussion, prayer groups",
    status: "future" as const,
  },
];

const changelog = [
  { version: "v0.1.4", date: "May 2026", items: ["Login & sign-out flow", "Info page with roadmap", "Session management"] },
  { version: "v0.1.3", date: "May 2026", items: ["Save & report prayers", "iOS PWA fixes", "Profile pages"] },
  { version: "v0.1.2", date: "Apr 2026", items: ["Prayer feed with filters", "Submit prayer flow", "Onboarding"] },
  { version: "v0.1.1", date: "Apr 2026", items: ["World map with hotspots", "Bottom navigation", "Splash screen"] },
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
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ background: "#0A1A3A" }}
    >
      <div className="flex-1 px-4 pb-28 overflow-y-auto pt-24">
        <div className="max-w-md mx-auto space-y-8">

          {/* ── Prototype notice ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <InfoIcon size={16} className="text-[#7c8fff]" />
              <h2 className="text-[#e2e4f0] font-heading text-sm font-light">
                Prototype Notice
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
                You&apos;re testing an early version of Oratio. Everything you see here is a prototype.
              </p>
              <ul className="space-y-2 text-[#6b7499] text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-[#7c8fff] mt-0.5">•</span>
                  <span>Data is stored in <strong className="text-[#8890b5]">this browser only</strong>. Switching browsers or clearing your data will reset your experience.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#7c8fff] mt-0.5">•</span>
                  <span>Prayers shown in the feed are mock data for demonstration purposes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#7c8fff] mt-0.5">•</span>
                  <span>Your feedback is invaluable — it shapes what comes next.</span>
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

          {/* ── Install Oratio ── */}
          {!isStandalone && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Smartphone size={16} className="text-[#7c8fff]" />
                <h2 className="text-[#e2e4f0] font-heading text-sm font-light">
                  Install Oratio
                </h2>
              </div>
              <div
                className="rounded-xl p-4 border"
                style={{
                  background: "rgba(124,143,255,0.04)",
                  borderColor: "rgba(124,143,255,0.08)",
                }}
              >
                {isIOS ? (
                  <>
                    <p className="text-[#d0d4e8] text-sm mb-3">
                      Get the full Oratio experience — install it on your home screen like any other app.
                    </p>
                    <ol className="space-y-2 text-[#6b7499] text-xs">
                      <li className="flex items-start gap-2">
                        <span className="text-[#7c8fff] mt-0.5 font-medium">1.</span>
                        <span>Tap the <strong className="text-[#8890b5]">Share</strong> button <span className="inline-flex items-center gap-0.5">(<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5a6080" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>)</span> at the bottom of Safari</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#7c8fff] mt-0.5 font-medium">2.</span>
                        <span>Scroll down and tap <strong className="text-[#8890b5]">Add to Home Screen</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#7c8fff] mt-0.5 font-medium">3.</span>
                        <span>Tap <strong className="text-[#8890b5]">Add</strong> in the top-right corner</span>
                      </li>
                    </ol>
                    <p className="text-[#4e5573] text-[10px] mt-3">Oratio will open full-screen, just like a native app.</p>
                  </>
                ) : (
                  <>
                    <p className="text-[#d0d4e8] text-sm mb-3">
                      Install Oratio on your device for quick access and a full-screen experience.
                    </p>
                    <ol className="space-y-2 text-[#6b7499] text-xs">
                      <li className="flex items-start gap-2">
                        <span className="text-[#7c8fff] mt-0.5 font-medium">1.</span>
                        <span>Open Chrome and navigate to Oratio</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#7c8fff] mt-0.5 font-medium">2.</span>
                        <span>Tap the Chrome menu <strong className="text-[#8890b5]">⋮</strong> (three dots)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#7c8fff] mt-0.5 font-medium">3.</span>
                        <span>Tap <strong className="text-[#8890b5]">Install Oratio</strong> or <strong className="text-[#8890b5]">Add to Home Screen</strong></span>
                      </li>
                    </ol>
                  </>
                )}
                <div className="mt-3 pt-3 border-t border-[rgba(124,143,255,0.06)]">
                  <p className="text-[#4e5573] text-[10px]">Takes 30 seconds</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Changelog ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <GitCommit size={16} className="text-[#7c8fff]" />
              <h2 className="text-[#e2e4f0] font-heading text-sm font-light">
                Changelog
              </h2>
            </div>
            <div className="space-y-2">
              {changelog.map((entry) => (
                <div
                  key={entry.version}
                  className="rounded-xl px-4 py-3"
                  style={{
                    background: "rgba(17, 26, 58, 0.4)",
                    border: "1px solid rgba(124,143,255,0.05)",
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[#7c8fff] text-xs font-mono">{entry.version}</span>
                    <span className="text-[#4e5573] text-[10px]">{entry.date}</span>
                  </div>
                  <ul className="space-y-1">
                    {entry.items.map((item) => (
                      <li key={item} className="text-[#6b7499] text-xs flex items-start gap-1.5">
                        <span className="text-[#4e5573] mt-0.5">-</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Footer credit ── */}
          <p className="text-center text-[#3e4460] text-[10px] pb-4">
            Oratio Prototype · Built with care
          </p>
        </div>
      </div>
    </div>
  );
}
