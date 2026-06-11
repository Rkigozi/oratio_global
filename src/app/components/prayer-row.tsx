import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { MapPin, Trash2 } from "lucide-react";
import type { PrayerRequest } from "../data/prayer-data";
import { timeAgo, getAttributionText } from "../data/prayer-data";
import { categoryColors } from "../data/profile-data";

interface PrayerRowProps {
  prayer: PrayerRequest;
  index: number;
  showCount: boolean;
  canManage: boolean;
  onTap: (prayer: PrayerRequest) => void;
  onDelete?: (prayerId: string) => void;
  hasPrayed?: boolean;
  onTogglePrayed?: (id: string) => void;
  showPrayedToggle?: boolean;
}

export function PrayerRow({
  prayer,
  index,
  showCount,
  canManage,
  onTap,
  onDelete,
  hasPrayed = false,
  onTogglePrayed,
  showPrayedToggle = false,
}: PrayerRowProps) {
  const [prayed, setPrayed] = useState(hasPrayed);

  useEffect(() => {
    setPrayed(hasPrayed);
  }, [hasPrayed, prayer.id]);

  const handlePray = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPrayed = !prayed;
    setPrayed(newPrayed);
    if (onTogglePrayed) onTogglePrayed(prayer.id);
  };

  const catColor = categoryColors[prayer.category || "Other"] || "#8890b5";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.5), duration: 0.35 }}
      onClick={canManage ? () => onTap(prayer) : undefined}
      className={`rounded-xl px-4 py-3.5 relative overflow-hidden ${canManage ? "cursor-pointer active:bg-[rgba(124,143,255,0.05)] transition-colors duration-150" : ""}`}
      style={{
        background:
          "linear-gradient(160deg, rgba(17, 26, 58, 0.6), rgba(12, 18, 48, 0.4))",
        border: "1px solid rgba(124,143,255,0.06)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p
            className="text-[#d0d4e8] line-clamp-2 mb-1"
            style={{ fontSize: "0.85rem", lineHeight: 1.6 }}
          >
            {prayer.text}
          </p>
          <span className="text-[#6b7499] text-[11px] mb-1 block">
            {getAttributionText(prayer)}
          </span>
          <div className="flex items-center gap-2">
            <MapPin size={10} className="text-[#5a6080] flex-shrink-0" />
            <span className="text-[#5a6080] text-[11px]">
              {prayer.city}
            </span>
            {prayer.category && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                style={{
                  color: catColor,
                  background: `${catColor}12`,
                  border: `1px solid ${catColor}18`,
                }}
              >
                {prayer.category}
              </span>
            )}
            {prayer.createdAt && (
              <span className="text-[#6b7499] text-[10px] ml-auto">
                {timeAgo(prayer.createdAt)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          {showCount && (
            <div className="flex items-center gap-1">
              <span className="text-xs opacity-60">🙏</span>
              <span className="text-[#6b7499] text-[11px]">
                {prayer.prayerCount}
              </span>
            </div>
          )}
          {showPrayedToggle && onTogglePrayed && (
            <button
              onClick={handlePray}
              className="flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-300 cursor-pointer"
              style={{
                background: prayed
                  ? "rgba(124, 143, 255, 0.1)"
                  : "rgba(124, 143, 255, 0.06)",
                border: `1px solid ${
                  prayed ? "rgba(124, 143, 255, 0.2)" : "rgba(124, 143, 255, 0.1)"
                }`,
              }}
              title={prayed ? "Unpray" : "Pray"}
            >
              <span className={`text-sm transition-all duration-300 ${prayed ? "opacity-100" : "opacity-60"}`}>
                🙏
              </span>
            </button>
          )}
          {canManage && onDelete && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => { e.preventDefault(); }}
              onTouchStart={(e) => { e.preventDefault(); }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDelete(prayer.id);
              }}
              className="text-[#5a6080] hover:text-[#8890b5] cursor-pointer"
              title="Delete prayer"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
