import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, Send, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { PrayerRequest } from '../../services/prayer-data';
import {
  getComments,
  getCommentCount,
  createComment,
  updateComment,
  deleteComment,
  subscribeToPrayerCommentChanges,
  type Comment,
} from '../../services/supabase-queries';
import { useAuth } from '../../hooks/auth-context';
import { captureEvent } from '../../../lib/analytics';
import { CommentThread } from './comment-thread';

interface Props {
  prayer: PrayerRequest;
  commentCount: number;
  onCommentCountChange: (count: number) => void;
}

const PAGE_SIZE = 20;

export function CommentSection({ prayer, commentCount, onCommentCountChange }: Props) {
  const { profile, user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitRef = useRef(false);
  const loadedLimitRef = useRef(PAGE_SIZE);

  const loadComments = useCallback(
    async (limit = PAGE_SIZE) => {
      const [data, total] = await Promise.all([
        getComments(prayer.id, limit, 0),
        getCommentCount(prayer.id),
      ]);

      setComments(data);
      setHasMore(data.length < total);
      setOffset(data.length);
      loadedLimitRef.current = Math.max(PAGE_SIZE, data.length);
      onCommentCountChange(total);
    },
    [onCommentCountChange, prayer.id]
  );

  useEffect(() => {
    let active = true;

    const loadInitialComments = async () => {
      setLoading(true);
      setComments([]);
      setOffset(0);

      try {
        const [data, total] = await Promise.all([
          getComments(prayer.id, PAGE_SIZE, 0),
          getCommentCount(prayer.id),
        ]);
        if (!active) return;
        setComments(data);
        setHasMore(data.length < total);
        setOffset(data.length);
        loadedLimitRef.current = Math.max(PAGE_SIZE, data.length);
        onCommentCountChange(total);
      } catch {
        if (!active) return;
        setComments([]);
        setHasMore(false);
        onCommentCountChange(0);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadInitialComments();

    return () => {
      active = false;
    };
  }, [onCommentCountChange, prayer.id]);

  useEffect(() => {
    let active = true;
    let refreshTimer: number | undefined;

    let unsubscribe = () => {};

    try {
      unsubscribe = subscribeToPrayerCommentChanges(prayer.id, () => {
        if (refreshTimer) window.clearTimeout(refreshTimer);

        refreshTimer = window.setTimeout(() => {
          if (!active) return;
          void loadComments(Math.max(PAGE_SIZE, loadedLimitRef.current));
        }, 250);
      });
    } catch {
      // Realtime comments are enhancement-only; initial load and manual refresh still work.
    }

    return () => {
      active = false;
      if (refreshTimer) window.clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [loadComments, prayer.id]);

  const loadMore = () => {
    const load = async () => {
      setLoadingMore(true);

      try {
        const data = await getComments(prayer.id, PAGE_SIZE, offset);
        setComments((prev) => {
          const next = [...prev, ...data];
          loadedLimitRef.current = Math.max(PAGE_SIZE, next.length);
          return next;
        });
        setOffset((prev) => {
          const next = prev + data.length;
          loadedLimitRef.current = Math.max(PAGE_SIZE, next);
          return next;
        });
        setHasMore(data.length === PAGE_SIZE);
      } finally {
        setLoadingMore(false);
      }
    };

    void load();
  };

  const handleSubmit = useCallback(async () => {
    const text = newComment.trim();
    if (!text || submitRef.current) return;
    submitRef.current = true;
    setSubmitting(true);
    const comment = await createComment({
      prayer_id: prayer.id,
      body: text,
      parent_id: replyTo?.id,
    });
    if (comment) {
      captureEvent('comment_added', { prayerId: prayer.id, hasParent: !!replyTo });
      const newCommentObj = comment.user
        ? comment
        : {
            ...comment,
            user: profile
              ? { username: profile.username, display_name: profile.display_name, avatar_url: null }
              : null,
          };
      setComments((prev) => {
        const updated = [...prev, newCommentObj];
        onCommentCountChange(updated.length);
        return updated;
      });
      setNewComment('');
      setReplyTo(null);
    }
    submitRef.current = false;
    setSubmitting(false);
  }, [newComment, replyTo, prayer.id, onCommentCountChange, profile]);

  const handleDelete = async (commentId: string) => {
    const ok = await deleteComment(commentId);
    if (ok) {
      setComments((prev) => {
        const filtered = prev.filter((c) => c.id !== commentId && c.parent_id !== commentId);
        onCommentCountChange(filtered.length);
        return filtered;
      });
    }
  };

  const handleUpdate = useCallback(async (commentId: string, body: string) => {
    const text = body.trim();
    if (!text) return false;

    const updated = await updateComment(commentId, text);
    if (!updated) return false;

    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? {
              ...updated,
              user: updated.user ?? comment.user,
            }
          : comment
      )
    );
    return true;
  }, []);

  const canModerateComments =
    !!user &&
    (prayer.authorId
      ? prayer.authorId === user.id
      : !!prayer.username && prayer.username === profile?.username);
  const isPrivatePrayer = prayer.audience === 'private';
  const sectionLabel = isPrivatePrayer ? 'Notes' : 'Comments';
  const emptyText = isPrivatePrayer
    ? 'No notes yet. Add a thought, reflection, or update for later.'
    : 'No comments yet. Be the first to encourage them.';
  const signedOutPrompt = isPrivatePrayer
    ? 'to add a private note.'
    : 'to leave an encouragement.';
  const placeholder = replyTo
    ? 'Write a reply...'
    : isPrivatePrayer
      ? 'Write a private note...'
      : 'Write an encouragement...';
  const topLevel = comments.filter((c) => !c.parent_id);
  const replies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  return (
    <div className="w-full mt-6 pt-4 border-t border-accent/8">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle size={14} className="text-text-dim" />
        <span className="text-text-muted text-xs uppercase tracking-[0.15em]">
          {sectionLabel} ({commentCount})
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
        </div>
      ) : topLevel.length === 0 ? (
        <p className="text-text-dim text-xs text-center py-4">{emptyText}</p>
      ) : (
        <div className="space-y-3 mb-4">
          {topLevel.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              replies={replies(comment.id)}
              onReply={(id, username) => setReplyTo({ id, username })}
              onDelete={(id) => void handleDelete(id)}
              onUpdate={handleUpdate}
              canModerateComments={canModerateComments}
            />
          ))}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-2 text-xs text-accent hover:text-accent transition-colors cursor-pointer disabled:opacity-50 text-center"
            >
              {loadingMore ? 'Loading...' : `Load more comments`}
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-2 px-1">
              <ChevronDown size={10} className="text-text-dim transform -rotate-90" />
              <span className="text-text-dim text-[10px]">Replying to @{replyTo.username}</span>
              <button
                onClick={() => setReplyTo(null)}
                className="text-text-faint hover:text-text-muted transition-colors cursor-pointer ml-auto"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!profile ? (
        <p className="text-text-dim text-xs text-center py-3">
          <a href="/login" className="text-accent hover:underline">
            Sign in
          </a>{' '}
          {signedOutPrompt}
        </p>
      ) : (
        <div className="flex gap-2 items-end">
          <div className="relative flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder={placeholder}
              rows={1}
              maxLength={500}
              className="w-full rounded-xl px-3 py-2.5 text-text placeholder-text-dim text-xs focus:outline-none border border-accent/12 focus:border-accent/30 transition-colors resize-none"
              style={{ background: 'rgba(var(--rgb-surface), 0.6)', minHeight: 36 }}
            />
            <span className="absolute bottom-1.5 right-2.5 text-[10px] text-text-faint pointer-events-none">
              {newComment.length}/500
            </span>
          </div>
          <button
            onClick={() => void handleSubmit()}
            disabled={!newComment.trim() || submitting}
            className="p-2.5 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
            style={{
              background: newComment.trim()
                ? 'linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))'
                : 'rgba(var(--rgb-accent), 0.06)',
              color: newComment.trim() ? '#ffffff' : 'rgb(var(--rgb-text-dim))',
              width: 36,
              height: 36,
            }}
          >
            {submitting ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
