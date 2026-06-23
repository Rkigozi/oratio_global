import { useState, useEffect, useCallback, useRef } from "react";
import { MessageCircle, Send, ChevronDown, X, Flag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { PrayerRequest } from '../../services/prayer-data';
import { timeAgo } from '../../services/prayer-data';
import { reportContent } from '../../services/api';
import { getComments, getCommentCount, createComment, deleteComment } from '../../services/supabase-queries';
import type { Comment } from '../../services/supabase-queries';
import { getInitialAvatarUrl } from '../../services/upload';
import { useAuth } from '../../hooks/auth-context';
import posthog from "posthog-js";

interface Props {
  prayer: PrayerRequest;
  commentCount: number;
  onCommentCountChange: (count: number) => void;
}

const PAGE_SIZE = 20;

export function CommentSection({ prayer, commentCount, onCommentCountChange }: Props) {
  const { profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitRef = useRef(false);

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

  const loadMore = () => {
    const load = async () => {
      setLoadingMore(true);

      try {
        const data = await getComments(prayer.id, PAGE_SIZE, offset);
        setComments((prev) => [...prev, ...data]);
        setOffset((prev) => prev + data.length);
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
      posthog.capture("comment_added", { prayerId: prayer.id, hasParent: !!replyTo });
      const newCommentObj = { ...comment, user: profile ? { username: profile.username, display_name: profile.display_name } : null };
      setComments((prev) => {
        const updated = [...prev, newCommentObj];
        onCommentCountChange(updated.length);
        return updated;
      });
      setNewComment("");
      setReplyTo(null);
    }
    submitRef.current = false;
    setSubmitting(false);
  }, [newComment, replyTo, prayer.id, onCommentCountChange, profile]);

  const handleDelete = async (commentId: string) => {
    const ok = await deleteComment(commentId);
    if (ok) {
      setComments((prev) => {
        const filtered = prev.filter((c) => c.id !== commentId);
        onCommentCountChange(filtered.length);
        return filtered;
      });
    }
  };

  const topLevel = comments.filter((c) => !c.parent_id);
  const replies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  return (
    <div className="w-full mt-6 pt-4 border-t border-accent/8">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle size={14} className="text-text-dim" />
        <span className="text-text-muted text-xs uppercase tracking-[0.15em]">
          Comments ({commentCount})
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
        </div>
      ) : topLevel.length === 0 ? (
        <p className="text-text-dim text-xs text-center py-4">
          No comments yet. Be the first to encourage them.
        </p>
      ) : (
        <div className="space-y-3 mb-4">
          {topLevel.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              replies={replies(comment.id)}
              onReply={(id, username) => setReplyTo({ id, username })}
              onDelete={(id) => void handleDelete(id)}
            />
          ))}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-2 text-xs text-accent hover:text-accent transition-colors cursor-pointer disabled:opacity-50 text-center"
            >
              {loadingMore ? "Loading..." : `Load more comments`}
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-2 px-1">
              <ChevronDown size={10} className="text-text-dim transform -rotate-90" />
              <span className="text-text-dim text-[10px]">
                Replying to @{replyTo.username}
              </span>
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
          <a href="/login" className="text-accent hover:underline">Sign in</a> to leave an encouragement.
        </p>
      ) : (
        <div className="flex gap-2 items-end">
          <div className="relative flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder={replyTo ? "Write a reply..." : "Write an encouragement..."}
              rows={1}
              maxLength={500}
              className="w-full rounded-xl px-3 py-2.5 text-text placeholder-text-dim text-xs focus:outline-none border border-accent/12 focus:border-accent/30 transition-colors resize-none"
              style={{ background: "rgba(var(--rgb-surface), 0.6)", minHeight: 36 }}
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
              background: newComment.trim() ? "linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))" : "rgba(var(--rgb-accent), 0.06)",
              color: newComment.trim() ? "#ffffff" : "rgb(var(--rgb-text-dim))",
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

function CommentThread({
  comment,
  replies,
  onReply,
  onDelete,
}: {
  comment: Comment;
  replies: Comment[];
  onReply: (id: string, username: string) => void;
  onDelete: (id: string) => void;
}) {
  const { user } = useAuth();
  const username = comment.user?.username || comment.user?.display_name || "Anonymous";
  const [reported, setReported] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);

  const handleReport = async () => {
    await reportContent({ reportable_type: "comment", reportable_id: comment.id, reason: "Upsetting or harmful" });
    setReported(true);
    setShowReportConfirm(true);
    setTimeout(() => setShowReportConfirm(false), 2000);
  };

  const visibleReplies = showAllReplies ? replies : replies.slice(0, 1);
  const hiddenCount = replies.length - 1;

  return (
    <div>
      <div className="flex gap-2.5">
        {/* Avatar */}
        <img
          src={getInitialAvatarUrl(username)}
          alt={username || "User"}
          className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5 object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-text-muted text-[11px] font-medium">@{username}</span>
            <span className="text-text-dim text-[9px]">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed">{comment.body}</p>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => onReply(comment.id, username)}
              className="text-text-dim hover:text-accent text-[10px] transition-colors cursor-pointer"
            >
              Reply
            </button>
            {user && comment.user_id === user.id && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-text-faint hover:text-danger text-[10px] transition-colors cursor-pointer"
              >
                Delete
              </button>
            )}
            {!reported && !(user && comment.user_id === user.id) && (
              <button
                onClick={() => void handleReport()}
                className="text-text-faint hover:text-warning text-[10px] transition-colors cursor-pointer"
              >
                Report
              </button>
            )}
            {reported && (
              <span className="text-warning text-[10px] flex items-center gap-1">
                <Flag size={9} /> Reported
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Report confirmation toast */}
      <AnimatePresence>
        {showReportConfirm && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-warning text-[10px] ml-9 mt-1"
          >
            Thanks for reporting — we&apos;ll review it.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Instagram-style replies */}
      {replies.length > 0 && (
        <div className="ml-9 mt-2 border-l-2 border-accent/6 pl-3 space-y-2">
          {visibleReplies.map((reply) => {
            const replyUsername = reply.user?.username || reply.user?.display_name || "Anonymous";
            return (
              <div key={reply.id}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-text-muted text-[10px] font-medium">@{replyUsername}</span>
                  <span className="text-text-dim text-[9px]">{timeAgo(reply.created_at)}</span>
                </div>
                <p className="text-text-dim text-sm leading-relaxed">{reply.body}</p>
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={() => onReply(reply.id, replyUsername)}
                    className="text-text-dim hover:text-accent text-[10px] transition-colors cursor-pointer"
                  >
                    Reply
                  </button>
                  {(user && reply.user_id === user.id) && (
                    <button
                      onClick={() => onDelete(reply.id)}
                      className="text-text-faint hover:text-danger text-[10px] transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {hiddenCount > 0 && !showAllReplies && (
            <button
              onClick={() => setShowAllReplies(true)}
              className="text-accent text-[10px] hover:text-accent transition-colors cursor-pointer"
            >
              View {hiddenCount} more {hiddenCount === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

