import { motion } from "motion/react";
import { Route, Smartphone, Globe, Heart, Gift } from "lucide-react";

const roadmapItems = [
  {
    icon: Smartphone,
    label: "iOS App",
    desc: "Native iPhone app with full prayer experience — feed, map, comments, notifications.",
    status: "next" as const,
  },
  {
    icon: Globe,
    label: "Android App",
    desc: "Android version with all features, available on Google Play.",
    status: "planned" as const,
  },
  {
    icon: Heart,
    label: "Prayer Responses",
    desc: "Write and receive written prayer responses alongside the 🙏 button.",
    status: "planned" as const,
  },
  {
    icon: Gift,
    label: "Testimonies",
    desc: "Mark prayers as answered and share testimonies with the community.",
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
  return (
    <div className="w-full min-h-dvh flex flex-col" style={{ background: "#0A1A3A" }}>
      <div className="flex-1 px-4 pb-16 overflow-y-auto pt-24">
        <div className="max-w-md mx-auto space-y-8">
          {/* About */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-[#e2e4f0] font-heading text-sm font-light mb-4">
              About Oratio
            </h2>
            <div
              className="rounded-xl p-4 border"
              style={{
                background: "rgba(124,143,255,0.04)",
                borderColor: "rgba(124,143,255,0.08)",
              }}
            >
              <p className="text-[#d0d4e8] text-sm leading-relaxed mb-3">
                Oratio is a global Christian prayer platform designed to connect people through shared prayer.
              </p>
              <p className="text-[#6b7499] text-xs leading-relaxed mb-3">
                Our mission is to unite believers worldwide in prayer — across countries, languages, and denominations.
                Whether you're part of a thriving church community or praying alone, Oratio helps you
                share your needs, pray for others, and experience the power of a global prayer network.
              </p>
              <p className="text-[#4e5573] text-xs">
                Coming soon to iOS and Android. Being built with care by a small team passionate about prayer.
              </p>
            </div>
          </motion.div>

          {/* Roadmap */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Route size={16} className="text-[#7c8fff]" />
              <h2 className="text-[#e2e4f0] font-heading text-sm font-light">Roadmap</h2>
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

          {/* Footer credit */}
          <p className="text-center text-[#3e4460] text-[10px] pb-4">
            Oratio · Built with faith and care
          </p>
        </div>
      </div>
    </div>
  );
}
