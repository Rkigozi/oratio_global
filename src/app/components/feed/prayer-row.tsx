import { motion } from "motion/react";
import { MapPin, Trash2 } from "lucide-react";
import type { PrayerRequest } from '../../services/prayer-data';
import { timeAgo, getAttributionText } from '../../services/prayer-data';
import { renderHashtags } from '../../services/hashtags';

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
  onTagClick?: (tag: string) => void;
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
  onTagClick,
}: PrayerRowProps) {
  const prayed = hasPrayed;

  const handlePray = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTogglePrayed) onTogglePrayed(prayer.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.5), duration: 0.35 }}
      onClick={canManage ? () => onTap(prayer) : undefined}
      className={`rounded-xl px-4 py-3.5 relative overflow-hidden ${canManage ? "cursor-pointer active:bg-accent/5 transition-colors duration-150" : ""}`}
      style={{
        background:
          "linear-gradient(160deg, rgba(var(--rgb-surface), 0.6), rgba(var(--rgb-surface), 0.4))",
        border: "1px solid rgba(var(--rgb-accent), 0.06)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p
            className="text-text-secondary line-clamp-2 mb-1"
            style={{ fontSize: "0.85rem", lineHeight: 1.6 }}
          >
            {onTagClick ? renderHashtags(prayer.text, onTagClick) : prayer.text}
          </p>
          <span className="text-text-muted text-[11px] mb-1 block">
            {getAttributionText(prayer)}
          </span>
          <div className="flex items-center gap-2">
            <MapPin size={10} className="text-text-dim flex-shrink-0" />
            <span className="text-text-dim text-[11px]">
              {prayer.city || "Unknown"}
            </span>
            {prayer.createdAt && (
              <span className="text-text-muted text-[10px] ml-auto">
                {timeAgo(prayer.createdAt)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          {showCount && (
            <div className="flex items-center gap-1">
              <span className="text-xs opacity-60">🙏</span>
              <span className="text-text-muted text-[11px]">
                {prayer.prayerCount ?? 0}
              </span>
            </div>
          )}
          {showPrayedToggle && onTogglePrayed && (
            <button
              onClick={handlePray}
              className="flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-300 cursor-pointer"
              style={{
                background: prayed
                  ? "rgba(var(--rgb-accent), 0.1)"
                  : "rgba(var(--rgb-accent), 0.06)",
                border: `1px solid ${
                  prayed ? "rgba(var(--rgb-accent), 0.2)" : "rgba(var(--rgb-accent), 0.1)"
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
              className="text-text-dim hover:text-text-muted cursor-pointer"
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
