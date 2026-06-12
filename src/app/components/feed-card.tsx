import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { MessageCircle } from "lucide-react";
import type { PrayerRequest } from "../data/prayer-data";
import { timeAgo, getAttributionText } from "../data/prayer-data";
import { renderHashtags } from "../../lib/hashtags";
import { getInitialAvatarUrl } from "../../lib/upload";

interface FeedCardProps {
  prayer: PrayerRequest;
  index: number;
  hasPrayed: boolean;
  onPrayed: (id: string) => void;
  onTap: (prayer: PrayerRequest) => void;
  onTagClick?: (tag: string) => void;
  onUserClick?: (username: string) => void;
}


function getCommentCount(prayerId: string): number {
  try {
    const raw = localStorage.getItem(`oratio_comments_${prayerId}`);
    if (raw) return (JSON.parse(raw) as Array<unknown>).length;
  } catch { /* ignore */ }
  return 0;
}

export function FeedCard({ prayer, index, hasPrayed, onPrayed, onTap, onTagClick, onUserClick }: FeedCardProps) {
  const [prayed, setPrayed] = useState(hasPrayed);
  const [commentCount] = useState(() => getCommentCount(prayer.id));

  useEffect(() => {
    setPrayed(hasPrayed);
  }, [hasPrayed, prayer.id]);

  const handlePray = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPrayed = !prayed;
    setPrayed(newPrayed);
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
          "linear-gradient(160deg, rgba(17, 26, 58, 0.7), rgba(12, 18, 48, 0.5))",
        border: "1px solid rgba(124,143,255,0.07)",
      }}
    >
      {/* Sample badge for mock data */}
      {prayer.id.startsWith('feed-') && (
        <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(251,191,36,0.1)", color: "#a38a3a", border: "1px solid rgba(251,191,36,0.15)" }}
        >
          Sample
        </span>
      )}

      {/* Top row: avatar + name + location + time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={getInitialAvatarUrl(prayer.username || getAttributionText(prayer))}
            alt={prayer.username || "avatar"}
            className="w-5 h-5 rounded-full flex-shrink-0 object-cover cursor-pointer"
            onClick={(e) => { e.stopPropagation(); const u = prayer.username; if (u && onUserClick) onUserClick(u); }}
          />
          <button
            onClick={(e) => { e.stopPropagation(); const u = prayer.username; if (u && onUserClick) onUserClick(u); }}
            className="text-[#6b7499] text-xs truncate hover:text-[#8890b5] transition-colors cursor-pointer"
          >
            {getAttributionText(prayer)}
          </button>
        </div>
        <span className="text-[#4e5573] text-[10px] flex-shrink-0">
          {prayer.createdAt ? timeAgo(prayer.createdAt) : ""}
        </span>
      </div>

      {/* Prayer text with hashtags */}
      <p
        className="text-[#d0d4e8] mb-3 line-clamp-3"
        style={{ fontSize: "0.95rem", lineHeight: 1.7 }}
      >
        {onTagClick ? renderHashtags(prayer.text, onTagClick) : prayer.text}
      </p>

      {/* Actions: comment + pray */}
      <div className="flex items-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onTap(prayer); }}
          className="flex items-center gap-1 text-[#4e5573] hover:text-[#6b7499] text-xs transition-colors cursor-pointer"
        >
          <MessageCircle size={13} />
          <span>{commentCount > 0 ? commentCount : "Comment"}</span>
        </button>
        <button
          onClick={handlePray}
          className="flex items-center gap-1.5 text-xs transition-colors duration-300 cursor-pointer ml-auto"
          style={{ color: prayed ? "#7c8fff" : "#4e5573" }}
        >
          <span className={`text-sm transition-all duration-300 ${prayed ? "opacity-100" : "opacity-50"}`}>
            🙏
          </span>
          <span>{prayer.prayerCount}</span>
          <span className="text-[#3e4460]">·</span>
          <span className="text-[#3e4460] hover:text-[#6b7499] transition-colors">
            {prayed ? "Prayed" : "Pray"}
          </span>
        </button>
      </div>
    </motion.div>
  );
}
