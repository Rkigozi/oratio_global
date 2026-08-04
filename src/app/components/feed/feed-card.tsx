import { motion } from 'motion/react';
import { Lock, MessageCircle, Users } from 'lucide-react';
import type { PrayerRequest } from '../../services/prayer-data';
import { timeAgo, getAttributionText } from '../../services/prayer-data';
import { renderHashtags } from '../../services/hashtags';
import { AvatarImage } from '../avatar-image';

interface FeedCardProps {
  prayer: PrayerRequest;
  index: number;
  hasPrayed: boolean;
  onPrayed: (id: string) => void;
  onTap: (prayer: PrayerRequest) => void;
  onTagClick?: (tag: string) => void;
  onUserClick?: (username: string) => void;
}

export function FeedCard({
  prayer,
  index,
  hasPrayed,
  onPrayed,
  onTap,
  onTagClick,
  onUserClick,
}: FeedCardProps) {
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
      className="oratio-surface rounded-xl p-4 relative cursor-pointer active:scale-[0.99] transition-transform duration-150"
    >
      {/* Top row: avatar + name + location + time */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <AvatarImage
            src={prayer.avatarUrl}
            name={prayer.username || getAttributionText(prayer)}
            alt={prayer.username || 'avatar'}
            className="h-7 w-7 flex-shrink-0 cursor-pointer text-[11px]"
            onClick={(e) => {
              e.stopPropagation();
              const u = prayer.username;
              if (u && onUserClick) onUserClick(u);
            }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              const u = prayer.username;
              if (u && onUserClick) onUserClick(u);
            }}
            className="min-h-8 min-w-0 text-text-muted text-[12px] truncate hover:text-text-secondary transition-colors cursor-pointer text-left"
          >
            {getAttributionText(prayer)}
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {prayer.audience === 'circle' && (
            <span className="oratio-pill inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px]">
              <Users size={9} />
              Prayer Circle
            </span>
          )}
          {prayer.audience === 'private' && (
            <span className="oratio-pill inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px]">
              <Lock size={9} />
              Private
            </span>
          )}
          {prayer.editedAt && (
            <span className="oratio-pill rounded-full px-1.5 py-0.5 text-[9px]">
              Edited
            </span>
          )}
          <span className="text-text-dim text-[10px]">
            {prayer.createdAt ? timeAgo(prayer.createdAt) : ''}
          </span>
        </div>
      </div>

      {/* Prayer text with hashtags */}
      <p
        className="text-text mb-3 line-clamp-3"
        style={{ fontSize: '0.98rem', lineHeight: 1.62, fontWeight: 390 }}
      >
        {onTagClick ? renderHashtags(prayer.text, onTagClick) : prayer.text}
      </p>

      {/* Actions: comment + pray */}
      <div className="flex items-center gap-2 border-t border-text-faint/10 pt-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTap(prayer);
          }}
          className="-ml-2 flex min-h-10 items-center gap-1.5 rounded-full px-2 text-text-dim hover:text-text-muted hover:bg-text/5 text-xs transition-colors cursor-pointer"
          aria-label={
            prayer.commentsEnabled === false
              ? 'Comments are off'
              : `Open ${prayer.commentCount || 0} comments`
          }
        >
          <MessageCircle
            size={13}
            className={prayer.commentsEnabled === false ? 'opacity-30' : ''}
          />
          <span>
            {prayer.commentsEnabled === false
              ? 'Off'
              : prayer.commentCount
                ? prayer.commentCount
                : 0}
          </span>
        </button>
        <button
          onClick={handlePray}
          className="-mr-2 ml-auto flex min-h-10 items-center gap-1.5 rounded-full px-2 text-xs transition-colors duration-300 cursor-pointer hover:bg-text/5"
          style={{ color: prayed ? 'rgb(var(--rgb-accent))' : 'rgb(var(--rgb-text-dim))' }}
          aria-label={prayed ? 'Remove prayed marker' : 'Mark as prayed'}
        >
          <span
            className={`text-sm transition-all duration-300 ${prayed ? 'opacity-100' : 'opacity-50'}`}
          >
            🙏
          </span>
          <span>{prayer.prayerCount ?? 0}</span>
          <span className="text-text-faint">·</span>
          <span className="text-text-faint hover:text-text-muted transition-colors">
            {prayed ? 'Prayed' : 'Pray'}
          </span>
        </button>
      </div>
    </motion.div>
  );
}
