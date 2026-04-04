import { motion } from "motion/react";
import { Heart, Globe, Flame, MapPin } from "lucide-react";

const stats = [
  {
    icon: Heart,
    label: "Prayers Today",
    value: "3,842",
    color: "#7c8fff",
  },
  {
    icon: Globe,
    label: "Countries",
    value: "41",
    color: "#a78bfa",
  },
  {
    icon: Flame,
    label: "Active Requests",
    value: "217",
    color: "#67e8f9",
  },
];

const recentLocations = [
  { city: "Manila", country: "Philippines", time: "1 min ago" },
  { city: "São Paulo", country: "Brazil", time: "3 min ago" },
  { city: "Lagos", country: "Nigeria", time: "4 min ago" },
  { city: "Dallas", country: "USA", time: "7 min ago" },
  { city: "Rome", country: "Italy", time: "9 min ago" },
  { city: "London", country: "United Kingdom", time: "11 min ago" },
  { city: "Seoul", country: "South Korea", time: "14 min ago" },
  { city: "Nairobi", country: "Kenya", time: "18 min ago" },
  { city: "Bogotá", country: "Colombia", time: "21 min ago" },
  { city: "Jakarta", country: "Indonesia", time: "25 min ago" },
];

export function Activity() {
  return (
    <div className="w-full min-h-full px-6 pt-24 pb-28 overflow-y-auto" style={{ background: "#0A1A3A" }}>
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] h-[250px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(124, 143, 255, 0.04), transparent 70%)",
        }}
      />

      <div className="max-w-md mx-auto relative z-10">
        {/* Title */}
        <div className="text-center mb-10">
          <h2
            className="text-[#e2e4f0] mb-1.5 font-heading tracking-wide"
            style={{ fontSize: "1.4rem", fontWeight: 300 }}
          >
            Global Activity
          </h2>
          <p className="text-[#4e5573] text-xs uppercase tracking-[0.15em]">
            The world is lighting up with prayer
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2.5 mb-10">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="rounded-xl p-4 flex flex-col items-center justify-center text-center"
                style={{
                  background:
                    "linear-gradient(160deg, rgba(17, 26, 58, 0.8), rgba(12, 18, 48, 0.6))",
                  border: "1px solid rgba(124,143,255,0.06)",
                }}
              >
                <Icon
                  size={18}
                  style={{ color: stat.color }}
                  className="mb-2.5 opacity-70"
                />
                <p
                  className="text-[#e2e4f0] mb-0.5 font-heading"
                  style={{ fontSize: "1.5rem", fontWeight: 300 }}
                >
                  {stat.value}
                </p>
                <p className="text-[#4e5573] text-[10px] uppercase tracking-wider">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Recent prayer locations */}
        <div className="mb-4">
          <h3 className="text-[#6b7499] text-[11px] uppercase tracking-[0.15em] mb-4 px-1">
            Recent Prayer Locations
          </h3>

          <div className="space-y-1.5">
            {recentLocations.map((item, i) => (
              <motion.div
                key={`${item.city}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.04, duration: 0.4 }}
                className="flex items-center justify-between px-4 py-3 rounded-lg"
                style={{ background: "rgba(17, 26, 58, 0.4)" }}
              >
                <div className="flex items-center gap-3">
                  {/* Mini prayer light indicator */}
                  <div className="relative w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <div
                      className="absolute w-5 h-5 rounded-full"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(245,243,255,0.1), transparent 70%)",
                        filter: "blur(3px)",
                      }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full relative z-10"
                      style={{
                        background: "#F5F3FF",
                        boxShadow: "0 0 4px rgba(245,243,255,0.5)",
                      }}
                    />
                  </div>
                  <p className="text-[#c5cbe2] text-sm">
                    {item.city},{" "}
                    <span className="text-[#6b7499]">{item.country}</span>
                  </p>
                </div>
                <p className="text-[#3e4460] text-xs flex-shrink-0 ml-3">
                  {item.time}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
