import { motion } from "motion/react";
import { MessageCircle } from "lucide-react";
import type { PrayerRequest } from '../../services/prayer-data';
import { timeAgo, getAttributionText } from '../../services/prayer-data';
import { renderHashtags } from '../../services/hashtags';
import { getInitialAvatarUrl } from '../../services/upload';

interface FeedCardProps {
  prayer: PrayerRequest;
  index: number;
  hasPrayed: boolean;
  onPrayed: (id: string) => void;
  onTap: (prayer: PrayerRequest) => void;
  onTagClick?: (tag: string) => void;
  onUserClick?: (username: string) => void;
}

export function FeedCard({ prayer, index, hasPrayed, onPrayed, onTap, onTagClick, onUserClick }: FeedCardProps) {
  const prayed = hasPrayed;

  const handlePray = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPrayed(prayer.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.6), duration: 0.4 }}
      onClick={() => onTap(prayer)}
      className="rounded-2xl p-4 relative cursor-pointer active:scale-[0.98] transition-transform duration-150"
      style={{
        background:
          "linear-gradient(160deg, rgba(var(--rgb-surface), 0.7), rgba(var(--rgb-surface), 0.5))",
        border: "1px solid rgba(var(--rgb-accent), 0.07)",
      }}
    >
      {/* Top row: avatar + name + location + time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={prayer.avatarUrl || getInitialAvatarUrl(prayer.username || getAttributionText(prayer))}
            alt={prayer.username || "avatar"}
            className="w-5 h-5 rounded-full flex-shrink-0 object-cover cursor-pointer"
            onClick={(e) => { e.stopPropagation(); const u = prayer.username; if (u && onUserClick) onUserClick(u); }}
          />
          <button
            onClick={(e) => { e.stopPropagation(); const u = prayer.username; if (u && onUserClick) onUserClick(u); }}
            className="text-text-muted text-xs truncate hover:text-text-muted transition-colors cursor-pointer"
          >
            {getAttributionText(prayer)}
          </button>
        </div>
        <span className="text-text-dim text-[10px] flex-shrink-0">
          {prayer.createdAt ? timeAgo(prayer.createdAt) : ""}
        </span>
      </div>

      {/* Prayer text with hashtags */}
      <p
        className="text-text-secondary mb-3 line-clamp-3"
        style={{ fontSize: "0.95rem", lineHeight: 1.7 }}
      >
        {onTagClick ? renderHashtags(prayer.text, onTagClick) : prayer.text}
      </p>

      {/* Actions: comment + pray */}
      <div className="flex items-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onTap(prayer); }}
          className="flex items-center gap-1 text-text-dim hover:text-text-muted text-xs transition-colors cursor-pointer"
        >
          <MessageCircle size={13} className={prayer.commentsEnabled === false ? "opacity-30" : ""} />
          <span>{prayer.commentsEnabled === false ? "Off" : (prayer.commentCount ? prayer.commentCount : "Comment")}</span>
        </button>
        <button
          onClick={handlePray}
          className="flex items-center gap-1.5 text-xs transition-colors duration-300 cursor-pointer ml-auto"
          style={{ color: prayed ? "rgb(var(--rgb-accent))" : "rgb(var(--rgb-text-dim))" }}
        >
          <span className={`text-sm transition-all duration-300 ${prayed ? "opacity-100" : "opacity-50"}`}>
            🙏
          </span>
          <span>{prayer.prayerCount ?? 0}</span>
          <span className="text-text-faint">·</span>
          <span className="text-text-faint hover:text-text-muted transition-colors">
            {prayed ? "Prayed" : "Pray"}
          </span>
        </button>
      </div>
    </motion.div>
  );
}
