import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, Send, ChevronDown, X, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { PrayerRequest } from '../../services/prayer-data';
import { timeAgo } from '../../services/prayer-data';
import { reportContent } from '../../services/api';
import {
  getComments,
  getCommentCount,
  createComment,
  updateComment,
  deleteComment,
  subscribeToPrayerCommentChanges,
} from '../../services/supabase-queries';
import type { Comment } from '../../services/supabase-queries';
import { useAuth } from '../../hooks/auth-context';
import { captureEvent } from '../../../lib/analytics';
import { AvatarImage } from '../avatar-image';

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

    const unsubscribe = subscribeToPrayerCommentChanges(prayer.id, () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);

      refreshTimer = window.setTimeout(() => {
        if (!active) return;
        void loadComments(Math.max(PAGE_SIZE, loadedLimitRef.current));
      }, 250);
    });

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
          to leave an encouragement.
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
              placeholder={replyTo ? 'Write a reply...' : 'Write an encouragement...'}
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

function CommentThread({
  comment,
  replies,
  onReply,
  onDelete,
  onUpdate,
  canModerateComments,
}: {
  comment: Comment;
  replies: Comment[];
  onReply: (id: string, username: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, body: string) => Promise<boolean>;
  canModerateComments: boolean;
}) {
  const { user } = useAuth();
  const username = comment.user?.username || comment.user?.display_name || 'Anonymous';
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [reportedIds, setReportedIds] = useState<Set<string>>(() => new Set());
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const [reportErrorId, setReportErrorId] = useState<string | null>(null);

  const startEdit = (target: Comment) => {
    setEditingId(target.id);
    setEditText(target.body);
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditError('');
  };

  const saveEdit = async (target: Comment) => {
    const text = editText.trim();
    if (!text) {
      setEditError('Comment cannot be empty.');
      return;
    }
    if (text === target.body) {
      cancelEdit();
      return;
    }

    setSavingEdit(true);
    setEditError('');
    const ok = await onUpdate(target.id, text);
    setSavingEdit(false);

    if (!ok) {
      setEditError("We couldn't save that comment. Please try again.");
      return;
    }

    cancelEdit();
  };

  const handleReport = async (targetId: string) => {
    setReportingId(targetId);
    setReportErrorId(null);
    const result = await reportContent({
      reportable_type: 'comment',
      reportable_id: targetId,
      reason: 'Upsetting or harmful',
    });
    setReportingId(null);

    if (result.error) {
      setReportErrorId(targetId);
      return;
    }

    setReportedIds((current) => new Set(current).add(targetId));
    setReportMessageId(targetId);
    setTimeout(
      () => setReportMessageId((current) => (current === targetId ? null : current)),
      2500
    );
  };

  const visibleReplies = showAllReplies ? replies : replies.slice(0, 1);
  const hiddenCount = replies.length - 1;
  const isOwnComment = !!user && comment.user_id === user.id;
  const canDeleteComment = isOwnComment || canModerateComments;
  const renderEditedLabel = (target: Comment) => {
    const created = new Date(target.created_at).getTime();
    const updated = new Date(target.updated_at).getTime();
    if (!Number.isFinite(created) || !Number.isFinite(updated) || updated - created < 1000) {
      return null;
    }

    return <span className="text-text-faint text-[9px]">Edited</span>;
  };

  const renderBody = (target: Comment, textClassName: string) => {
    const isEditing = editingId === target.id;
    if (!isEditing) {
      return (
        <>
          <p className={textClassName}>{target.body}</p>
          {renderEditedLabel(target)}
        </>
      );
    }

    return (
      <div className="space-y-2">
        <textarea
          value={editText}
          onChange={(e) => {
            setEditText(e.target.value);
            setEditError('');
          }}
          rows={2}
          maxLength={500}
          className="w-full rounded-lg px-3 py-2 text-text placeholder-text-dim text-xs focus:outline-none border border-accent/12 focus:border-accent/30 transition-colors resize-none"
          style={{ background: 'rgba(var(--rgb-surface), 0.6)' }}
        />
        <div className="flex items-center gap-3">
          {editError ? (
            <p className="text-danger text-[10px] flex-1">{editError}</p>
          ) : (
            <p className="text-text-dim text-[10px] flex-1">{editText.length}/500</p>
          )}
          <button
            onClick={cancelEdit}
            disabled={savingEdit}
            className="text-text-dim hover:text-text-muted text-[10px] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void saveEdit(target)}
            disabled={savingEdit || !editText.trim()}
            className="text-accent hover:text-accent text-[10px] font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {savingEdit ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  };

  const renderReportNotice = (targetId: string) => (
    <AnimatePresence>
      {(reportMessageId === targetId || reportErrorId === targetId) && (
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className={`text-[10px] mt-1 ${
            reportErrorId === targetId ? 'text-danger' : 'text-warning'
          }`}
        >
          {reportErrorId === targetId
            ? "We couldn't send that report. Please try again."
            : 'Report sent for review.'}
        </motion.p>
      )}
    </AnimatePresence>
  );

  return (
    <div>
      <div className="flex gap-2.5">
        <AvatarImage
          src={comment.user?.avatar_url}
          name={username}
          alt={username || 'User'}
          className="h-7 w-7 flex-shrink-0 mt-0.5 text-[10px]"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-text-muted text-[11px] font-medium">@{username}</span>
            <span className="text-text-dim text-[9px]">{timeAgo(comment.created_at)}</span>
          </div>
          {renderBody(comment, 'text-text-secondary text-sm leading-relaxed')}
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => onReply(comment.id, username)}
              className="text-text-dim hover:text-accent text-[10px] transition-colors cursor-pointer"
            >
              Reply
            </button>
            {isOwnComment && (
              <button
                onClick={() => startEdit(comment)}
                className="text-text-dim hover:text-accent text-[10px] transition-colors cursor-pointer"
              >
                Edit
              </button>
            )}
            {canDeleteComment && (
              <button
                onClick={() => onDelete(comment.id)}
                aria-label={
                  isOwnComment ? `Delete comment by ${username}` : `Remove comment by ${username}`
                }
                className="text-text-faint hover:text-danger text-[10px] transition-colors cursor-pointer"
              >
                {isOwnComment ? 'Delete' : 'Remove'}
              </button>
            )}
            {!reportedIds.has(comment.id) && !canDeleteComment && (
              <button
                onClick={() => void handleReport(comment.id)}
                disabled={reportingId === comment.id}
                className="text-text-faint hover:text-warning text-[10px] transition-colors cursor-pointer"
              >
                {reportingId === comment.id ? 'Sending...' : 'Report'}
              </button>
            )}
            {reportedIds.has(comment.id) && (
              <span className="text-warning text-[10px] flex items-center gap-1">
                <Flag size={9} /> Reported
              </span>
            )}
          </div>
          {renderReportNotice(comment.id)}
        </div>
      </div>

      {/* Instagram-style replies */}
      {replies.length > 0 && (
        <div className="ml-9 mt-2 border-l-2 border-accent/6 pl-3 space-y-2">
          {visibleReplies.map((reply) => {
            const replyUsername = reply.user?.username || reply.user?.display_name || 'Anonymous';
            const isOwnReply = !!user && reply.user_id === user.id;
            const canDeleteReply = isOwnReply || canModerateComments;
            return (
              <div key={reply.id} className="flex gap-2">
                <AvatarImage
                  src={reply.user?.avatar_url}
                  name={replyUsername}
                  alt={replyUsername || 'User'}
                  className="h-5 w-5 flex-shrink-0 mt-0.5 text-[8px]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-text-muted text-[10px] font-medium">
                      @{replyUsername}
                    </span>
                    <span className="text-text-dim text-[9px]">{timeAgo(reply.created_at)}</span>
                  </div>
                  {renderBody(reply, 'text-text-dim text-sm leading-relaxed')}
                  <div className="flex items-center gap-3 mt-1">
                    <button
                      onClick={() => onReply(reply.id, replyUsername)}
                      className="text-text-dim hover:text-accent text-[10px] transition-colors cursor-pointer"
                    >
                      Reply
                    </button>
                    {isOwnReply && (
                      <button
                        onClick={() => startEdit(reply)}
                        className="text-text-dim hover:text-accent text-[10px] transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                    {canDeleteReply && (
                      <button
                        onClick={() => onDelete(reply.id)}
                        aria-label={
                          isOwnReply
                            ? `Delete reply by ${replyUsername}`
                            : `Remove reply by ${replyUsername}`
                        }
                        className="text-text-faint hover:text-danger text-[10px] transition-colors cursor-pointer"
                      >
                        {isOwnReply ? 'Delete' : 'Remove'}
                      </button>
                    )}
                    {!reportedIds.has(reply.id) && !canDeleteReply && (
                      <button
                        onClick={() => void handleReport(reply.id)}
                        disabled={reportingId === reply.id}
                        className="text-text-faint hover:text-warning text-[10px] transition-colors cursor-pointer"
                      >
                        {reportingId === reply.id ? 'Sending...' : 'Report'}
                      </button>
                    )}
                    {reportedIds.has(reply.id) && (
                      <span className="text-warning text-[10px] flex items-center gap-1">
                        <Flag size={9} /> Reported
                      </span>
                    )}
                  </div>
                  {renderReportNotice(reply.id)}
                </div>
              </div>
            );
          })}
          {hiddenCount > 0 && !showAllReplies && (
            <button
              onClick={() => setShowAllReplies(true)}
              className="text-accent text-[10px] hover:text-accent transition-colors cursor-pointer"
            >
              View {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
