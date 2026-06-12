import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Send, ChevronDown, X, Flag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { PrayerRequest } from "../data/prayer-data";
import { reportContent } from "../../lib/api";
import { createComment, deleteComment } from "../../lib/api";
import { getInitialAvatarUrl } from "../../lib/upload";

interface Comment {
  id: string;
  prayer_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  user?: { username: string; display_name: string } | null;
}

interface Props {
  prayer: PrayerRequest;
  commentCount: number;
  onCommentCountChange: (count: number) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function CommentSection({ prayer, commentCount, onCommentCountChange }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = loadLocalComments(prayer.id);
    setComments(stored);
    setLoading(false);
    onCommentCountChange(stored.length);
  }, [prayer.id]);

  const handleSubmit = useCallback(async () => {
    const text = newComment.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      await createComment({ prayer_id: prayer.id, body: text, parent_id: replyTo?.id });
    } catch {
      // API failed — fallback to localStorage
    }
    const comment = saveLocalComment(prayer.id, text, replyTo?.id);
    setComments((prev) => {
      const updated = [...prev, comment];
      onCommentCountChange(updated.length);
      return updated;
    });
    setNewComment("");
    setReplyTo(null);
    setSubmitting(false);
  }, [newComment, replyTo, prayer.id, submitting, onCommentCountChange]);

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
    } catch {
      // ignore
    }
    setComments((prev) => {
      const filtered = prev.filter((c) => c.id !== commentId);
      onCommentCountChange(filtered.length);
      return filtered;
    });
  };

  const topLevel = comments.filter((c) => !c.parent_id);
  const replies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  return (
    <div className="w-full mt-6 pt-4 border-t border-[rgba(124,143,255,0.08)]">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle size={14} className="text-[#5a6080]" />
        <span className="text-[#8890b5] text-xs uppercase tracking-[0.15em]">
          Comments ({commentCount})
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 rounded-full border-2 border-[rgba(124,143,255,0.2)] border-t-[#7c8fff] animate-spin" />
        </div>
      ) : topLevel.length === 0 ? (
        <p className="text-[#4e5573] text-xs text-center py-4">
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
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Reply indicator */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-2 px-1">
              <ChevronDown size={10} className="text-[#5a6080] transform -rotate-90" />
              <span className="text-[#5a6080] text-[10px]">
                Replying to @{replyTo.username}
              </span>
              <button
                onClick={() => setReplyTo(null)}
                className="text-[#3e4460] hover:text-[#6b7499] transition-colors cursor-pointer ml-auto"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comment input */}
      <div className="flex gap-2 items-end">
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
          maxLength={2000}
          className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-[#e2e4f0] placeholder-[#4e5573] text-xs focus:outline-none border border-[rgba(124,143,255,0.12)] focus:border-[rgba(124,143,255,0.3)] transition-colors resize-none"
          style={{ background: "rgba(15, 20, 50, 0.6)", minHeight: 36 }}
        />
        <button
          onClick={() => void handleSubmit()}
          disabled={!newComment.trim() || submitting}
          className="p-2.5 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          style={{
            background: newComment.trim() ? "linear-gradient(135deg, #7c8fff, #5a6fd6)" : "rgba(124,143,255,0.06)",
            color: newComment.trim() ? "#ffffff" : "#4e5573",
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
  const username = comment.user?.display_name || comment.user?.username || "Anonymous";
  const [reported, setReported] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);

  const handleReport = async () => {
    setShowReportConfirm(true);
    setTimeout(async () => {
      setShowReportConfirm(false);
      setReported(true);
      await reportContent({ reportable_type: "comment", reportable_id: comment.id, reason: "Upsetting or harmful" });
    }, 1500);
  };

  const visibleReplies = showAllReplies ? replies : replies.slice(0, 1);
  const hiddenCount = replies.length - 1;

  return (
    <div>
      <div className="flex gap-2.5">
        {/* Avatar */}
        <img
          src={getInitialAvatarUrl(username)}
          alt=""
          className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5 object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[#8890b5] text-[11px] font-medium">@{username}</span>
            <span className="text-[#4e5573] text-[9px]">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-[#c5cbe2] text-sm leading-relaxed">{comment.body}</p>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => onReply(comment.id, username)}
              className="text-[#5a6080] hover:text-[#7c8fff] text-[10px] transition-colors cursor-pointer"
            >
              Reply
            </button>
            <button
              onClick={() => onDelete(comment.id)}
              className="text-[#3e4460] hover:text-[#ff6b6b] text-[10px] transition-colors cursor-pointer"
            >
              Delete
            </button>
            {!reported && (
              <button
                onClick={handleReport}
                className="text-[#3e4460] hover:text-[#fbbf24] text-[10px] transition-colors cursor-pointer"
              >
                Report
              </button>
            )}
            {reported && (
              <span className="text-[#fbbf24] text-[10px] flex items-center gap-1">
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
            className="text-[#fbbf24] text-[10px] ml-9 mt-1"
          >
            Thanks for reporting — we'll review it.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Instagram-style replies */}
      {replies.length > 0 && (
        <div className="ml-9 mt-2 border-l-2 border-[rgba(124,143,255,0.06)] pl-3 space-y-2">
          {visibleReplies.map((reply) => {
            const replyUsername = reply.user?.display_name || reply.user?.username || "Anonymous";
            return (
              <div key={reply.id}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[#6b7499] text-[10px] font-medium">@{replyUsername}</span>
                  <span className="text-[#4e5573] text-[9px]">{timeAgo(reply.created_at)}</span>
                </div>
                <p className="text-[#b0b4c8] text-sm leading-relaxed">{reply.body}</p>
              </div>
            );
          })}
          {hiddenCount > 0 && !showAllReplies && (
            <button
              onClick={() => setShowAllReplies(true)}
              className="text-[#7c8fff] text-[10px] hover:text-[#a0b4ff] transition-colors cursor-pointer"
            >
              View {hiddenCount} more {hiddenCount === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── localStorage fallback ─────────────────────────────────────────────

function loadLocalComments(prayerId: string): Comment[] {
  try {
    const raw = localStorage.getItem(`oratio_comments_${prayerId}`);
    return raw ? (JSON.parse(raw) as Comment[]) : [];
  } catch {
    return [];
  }
}

let localCommentId = 1;
function getLocalUsername(): string {
  try {
    const raw = localStorage.getItem("oratio_profile");
    if (raw) {
      const profile = JSON.parse(raw) as { username?: string; displayName?: string };
      return profile.username || profile.displayName || "you";
    }
  } catch {
    // ignore
  }
  return "you";
}

function saveLocalComment(prayerId: string, body: string, parentId?: string): Comment {
  const username = getLocalUsername();
  const comment: Comment = {
    id: `local-comment-${Date.now()}-${localCommentId++}`,
    prayer_id: prayerId,
    user_id: "local",
    parent_id: parentId ?? null,
    body,
    created_at: new Date().toISOString(),
    user: { username, display_name: username },
  };
  try {
    const existing = loadLocalComments(prayerId);
    existing.push(comment);
    localStorage.setItem(`oratio_comments_${prayerId}`, JSON.stringify(existing));
  } catch {
    // ignore
  }
  return comment;
}
