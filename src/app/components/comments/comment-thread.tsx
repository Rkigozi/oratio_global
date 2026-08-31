import { useState } from 'react';
import { Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { timeAgo } from '../../services/prayer-data';
import { reportContent, type Comment } from '../../services/supabase-queries';
import { useAuth } from '../../hooks/auth-context';
import { AvatarImage } from '../avatar-image';

type CommentThreadProps = {
  comment: Comment;
  replies: Comment[];
  onReply: (id: string, username: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, body: string) => Promise<boolean>;
  canModerateComments: boolean;
};

export function CommentThread({
  comment,
  replies,
  onReply,
  onDelete,
  onUpdate,
  canModerateComments,
}: CommentThreadProps) {
  const { user } = useAuth();
  const username = comment.user?.username || comment.user?.display_name || 'Anonymous';
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [reportedIds, setReportedIds] = useState<Set<string>>(() => new Set());
  const [alreadyReportedIds, setAlreadyReportedIds] = useState<Set<string>>(() => new Set());
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
    if (reportedIds.has(targetId) || reportingId === targetId) return;

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
    if (result.alreadyReported) {
      setAlreadyReportedIds((current) => new Set(current).add(targetId));
    } else {
      setAlreadyReportedIds((current) => {
        const next = new Set(current);
        next.delete(targetId);
        return next;
      });
    }
    setReportMessageId(targetId);
    setTimeout(
      () => setReportMessageId((current) => (current === targetId ? null : current)),
      2500
    );
  };

  const visibleReplies = showAllReplies ? replies : replies.slice(0, 1);
  const hiddenCount = replies.length - 1;
  const isOwnComment = !!user && comment.user_id === user.id;

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
            : alreadyReportedIds.has(targetId)
              ? "You've already reported this comment. It's still saved for moderation."
              : 'Report sent for review.'}
        </motion.p>
      )}
    </AnimatePresence>
  );

  const renderActions = (
    target: Comment,
    targetUsername: string,
    isOwn: boolean,
    kind: 'comment' | 'reply'
  ) => {
    const canDelete = isOwn || canModerateComments;
    return (
      <div className="flex items-center gap-3 mt-1">
        <button
          onClick={() => onReply(target.id, targetUsername)}
          className="text-text-dim hover:text-accent text-[10px] transition-colors cursor-pointer"
        >
          Reply
        </button>
        {isOwn && (
          <button
            onClick={() => startEdit(target)}
            className="text-text-dim hover:text-accent text-[10px] transition-colors cursor-pointer"
          >
            Edit
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => onDelete(target.id)}
            aria-label={
              isOwn
                ? `Delete ${kind} by ${targetUsername}`
                : `Remove ${kind} by ${targetUsername}`
            }
            className="text-text-faint hover:text-danger text-[10px] transition-colors cursor-pointer"
          >
            {isOwn ? 'Delete' : 'Remove'}
          </button>
        )}
        {!reportedIds.has(target.id) && !canDelete && (
          <button
            onClick={() => void handleReport(target.id)}
            disabled={reportingId === target.id}
            className="text-text-faint hover:text-warning text-[10px] transition-colors cursor-pointer"
          >
            {reportingId === target.id ? 'Sending...' : 'Report'}
          </button>
        )}
        {reportedIds.has(target.id) && (
          <span className="text-warning text-[10px] flex items-center gap-1">
            <Flag size={9} /> Reported
          </span>
        )}
      </div>
    );
  };

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
          {renderActions(comment, username, isOwnComment, 'comment')}
          {renderReportNotice(comment.id)}
        </div>
      </div>

      {/* Instagram-style replies */}
      {replies.length > 0 && (
        <div className="ml-9 mt-2 border-l-2 border-accent/6 pl-3 space-y-2">
          {visibleReplies.map((reply) => {
            const replyUsername = reply.user?.username || reply.user?.display_name || 'Anonymous';
            const isOwnReply = !!user && reply.user_id === user.id;
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
                  {renderActions(reply, replyUsername, isOwnReply, 'reply')}
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
