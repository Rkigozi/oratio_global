import { useState } from "react";
import { motion } from "motion/react";
import { MapPin, Heart, UserCheck } from "lucide-react";
import type { PrayerRequest } from "../data/prayer-data";
import { timeAgo } from "../data/prayer-data";

interface FeedCardProps {
  prayer: PrayerRequest;
  index: number;
  onPrayed: (id: string) => void;
  onTap: (prayer: PrayerRequest) => void;
  onFollow?: (name: string) => void;
  following?: Set<string>;
}

const categoryColors: Record<string, string> = {
  Health: "#67e8f9",
  Family: "#a78bfa",
  Career: "#fbbf24",
  Guidance: "#7c8fff",
  Peace: "#6ee7b7",
  Other: "#8890b5",
};

export function FeedCard({ prayer, index, onPrayed, onTap, following }: FeedCardProps) {
  const [prayed, setPrayed] = useState(false);
  const [count, setCount] = useState(prayer.prayerCount);

  const handlePray = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (prayed) return;
    setPrayed(true);
    setCount((c) => c + 1);
    onPrayed(prayer.id);
  };

  const catColor = categoryColors[prayer.category || "Other"] || "#8890b5";
  const isFollowed = prayer.name && following?.has(prayer.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.6), duration: 0.4 }}
      onClick={() => onTap(prayer)}
      className="rounded-2xl p-4 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform duration-150"
      style={{
        background:
          "linear-gradient(160deg, rgba(17, 26, 58, 0.7), rgba(12, 18, 48, 0.5))",
        border: "1px solid rgba(124,143,255,0.07)",
      }}
    >
      {/* Top row: location + time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <MapPin size={12} className="text-[#5a6080]" />
          <span className="text-[#8890b5] text-xs">
            {prayer.city}, {prayer.country}
          </span>
        </div>
        <span className="text-[#3e4460] text-xs">
          {prayer.createdAt ? timeAgo(prayer.createdAt) : ""}
        </span>
      </div>

      {/* Prayer text — clamped to 3 lines */}
      <p
        className="text-[#d0d4e8] mb-3 line-clamp-3"
        style={{ fontSize: "0.9rem", lineHeight: 1.65 }}
      >
        &ldquo;{prayer.text}&rdquo;
      </p>

      {/* Bottom row: name + category + pray button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {prayer.name && (
            <span className="text-[#6b7499] text-xs flex items-center gap-1">
              &mdash; {prayer.name}
              {isFollowed && (
                <UserCheck size={10} className="text-[#6ee7b7] opacity-70" />
              )}
            </span>
          )}
          {prayer.category && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{
                color: catColor,
                background: `${catColor}15`,
                border: `1px solid ${catColor}20`,
              }}
            >
              {prayer.category}
            </span>
          )}
        </div>

        <button
          onClick={handlePray}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 cursor-pointer"
          style={{
            background: prayed
              ? "rgba(124, 143, 255, 0.1)"
              : "rgba(124, 143, 255, 0.06)",
            border: `1px solid ${
              prayed ? "rgba(124, 143, 255, 0.2)" : "rgba(124, 143, 255, 0.1)"
            }`,
          }}
        >
          <Heart
            size={13}
            className="transition-all duration-300"
            fill={prayed ? "#7c8fff" : "transparent"}
            color={prayed ? "#7c8fff" : "#6b7499"}
          />
          <span
            className="text-xs transition-colors duration-300"
            style={{ color: prayed ? "#7c8fff" : "#6b7499" }}
          >
            {count}
          </span>
        </button>
      </div>
    </motion.div>
  );
}
