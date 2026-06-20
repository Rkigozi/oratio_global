import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { ArrowLeft, MapPin, X, MoreHorizontal, Share2, Flag, Bookmark, MessageCircle } from "lucide-react";
import { timeAgo, getAttributionText } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";
import { CommentSection } from "../components/comment-section";
import { getInitialAvatarUrl } from "../../lib/upload";
import { reportContent } from "../../lib/api";
import { renderHashtags } from "../../lib/hashtags";
import { translateText, needsTranslation, detectLanguage } from "../../lib/translate";
import { getPrayerById, togglePray, toggleSavePrayer, followUser, unfollowUser, getProfileByUsername, isFollowing, toggleCommentsEnabled, getMyPrayedIds, getMySavedIds } from "../../lib/supabase-queries";
import { LoadingSpinner, ErrorState } from "../components/loading-spinner";
import { useAuth } from "../../lib/auth-context";
import { logError } from "../../lib/logger";
import posthog from "posthog-js";

export function PrayerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [localPrayer, setLocalPrayer] = useState<PrayerRequest | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getPrayerById(id).then((prayer) => {
      if (prayer) setLocalPrayer(prayer);
      setLoading(false);
    }).catch(() => {
      setError("Failed to load prayer");
      setLoading(false);
    });
  }, [id]);

  const prayer = localPrayer;
  const [prayedIds, setPrayedIds] = useState<string[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMyPrayedIds().then(setPrayedIds);
  }, []);

  useEffect(() => {
    if (!prayer) return;
    getMySavedIds().then(ids => setSaved(ids.includes(prayer.id)));
  }, [prayer]);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);
  const [reported, setReported] = useState(false);
  const [following, setFollowing] = useState(false);
  const { profile: authProfile } = useAuth();
  const isAuthor = prayer ? prayer.username === authProfile?.username : false;

  const username = prayer?.username;
  const handleFollowToggle = () => {
    if (!username) return;
    const newState = !following;
    setFollowing(newState);
    getProfileByUsername(username).then((prof) => {
      if (prof) {
        void (newState ? followUser(prof.id) : unfollowUser(prof.id));
      }
    });
  };

  useEffect(() => {
    if (!username) return;
    getProfileByUsername(username).then((prof) => {
      if (prof) {
        isFollowing(prof.id).then(setFollowing);
      }
    });
  }, [username]);

  const handleTranslate = async () => {
    if (!prayer || translating) return;
    if (translatedText) { setTranslatedText(null); return; }
    setTranslating(true);
    const result = await translateText(prayer.text, userLang);
    if (result) setTranslatedText(result);
    setTranslating(false);
  };

  const userLang = navigator.language.split("-")[0] || "en";
  const showTranslate = prayer ? needsTranslation(prayer.text, userLang) : false;
  const sourceLang = prayer && translatedText ? detectLanguage(prayer.text) : "";
  const langName: Record<string, string> = { es: "Spanish", fr: "French", pt: "Portuguese", de: "German", it: "Italian", en: "English" };

  const toggleSave = () => {
    const newSaved = !saved;
    setSaved(newSaved);
    void toggleSavePrayer(prayer!.id, newSaved);
    posthog.capture(newSaved ? "prayer_saved" : "prayer_unsaved", { prayerId: prayer!.id });
  };

  const handleReport = async (reason: string) => {
    setShowReport(false);
    try {
      await reportContent({ reportable_type: "prayer", reportable_id: prayer!.id, reason });
      posthog.capture("prayer_reported", { prayerId: prayer!.id, reason });
      setReported(true);
    } catch {
      logError("report prayer", "report failed");
    }
  };

  const [commentsEnabled, setCommentsEnabled] = useState(true);

  useEffect(() => {
    if (prayer) setCommentsEnabled(prayer.commentsEnabled ?? true);
  }, [prayer]);

  const handleToggleComments = () => {
    const newVal = !commentsEnabled;
    setCommentsEnabled(newVal);
    void toggleCommentsEnabled(prayer!.id, newVal);
  };

  const isPrayed = prayer ? prayedIds.includes(prayer.id) : false;

  const togglePrayed = useCallback((prayerId: string) => {
    setPrayedIds((prev) => {
      const isCurrentlyPrayed = prev.includes(prayerId);
      const newIds = isCurrentlyPrayed
        ? prev.filter((pid) => pid !== prayerId)
        : [...prev, prayerId];
      void togglePray(prayerId, !isCurrentlyPrayed);
      posthog.capture(isCurrentlyPrayed ? "prayer_unprayed" : "prayer_prayed", { prayerId });
      return newIds;
    });
  }, []);

  const handleShare = async () => {
    if (!prayer) return;
    const url = `${window.location.origin}/prayer/${prayer.id}`;
    const attribution = getAttributionText(prayer);
    const c = prayer.prayerCount ?? 0;
    const shareText = `🙏 Prayer request${attribution ? ` from ${attribution}` : ""}:\n\n"${prayer.text}"\n\n${c} ${c === 1 ? "person has" : "people have"} prayed.\n${url}`;
    if (navigator.share) {
      try { await navigator.share({ text: shareText }); } catch { /* ignore */ }
    } else {
      try { await navigator.clipboard.writeText(shareText); } catch { /* ignore */ }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full" style={{ background: "rgb(var(--rgb-bg))" }}>
        <LoadingSpinner text="Loading prayer..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full" style={{ background: "rgb(var(--rgb-bg))" }}>
        <ErrorState message={error} onRetry={() => { setLoading(true); setError(null); if (id) getPrayerById(id).then((p) => { if (p) setLocalPrayer(p); setLoading(false); }).catch(() => { setError("Failed to load prayer"); setLoading(false); }); }} />
        <button
          onClick={() => void navigate("/feed")}
          className="mt-2 px-5 py-2 rounded-full text-xs text-accent bg-accent/8 border border-accent/12 cursor-pointer"
        >
          Back to Feed
        </button>
      </div>
    );
  }

  if (!prayer) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full" style={{ background: "rgb(var(--rgb-bg))" }}>
        <p className="text-text-muted text-sm mb-4">Prayer not found</p>
        <button
          onClick={() => void navigate("/feed")}
          className="px-5 py-2 rounded-full text-xs text-accent bg-accent/8 border border-accent/12 cursor-pointer"
        >
          Back to Feed
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: "rgb(var(--rgb-bg))" }}
    >
      {/* Header with back button + menu */}
      <div
        className="flex-shrink-0 pt-[max(1.5rem,env(safe-area-inset-top))] pb-2 px-4"
        style={{
          background: "linear-gradient(to bottom, rgba(var(--rgb-bg), 0.98), rgba(var(--rgb-bg), 0))",
        }}
      >
        <div className="flex items-center justify-between mt-12">
          <button
            onClick={() => void navigate(-1)}
            className="flex items-center gap-2 text-text-muted hover:text-text-muted transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span className="text-xs">Back</span>
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 flex items-center justify-center rounded-full text-text-dim hover:text-text-muted hover:bg-accent/6 transition-all cursor-pointer"
            >
              <MoreHorizontal size={16} />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-accent/10 overflow-hidden z-30"
                  style={{
                    background: "rgba(var(--rgb-surface), 0.98)",
                    backdropFilter: "blur(16px)",
                  }}
                >
                  <button
                    onClick={() => { setShowMenu(false); handleShare(); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-text-secondary hover:bg-accent/8 transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Share2 size={12} />
                    Share
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); toggleSave(); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-text-secondary hover:bg-accent/8 transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Bookmark size={12} fill={saved ? "#c5cdff" : "none"} />
                    {saved ? "Saved" : "Save"}
                  </button>
                  {showTranslate && (
                    <button
                      onClick={() => { setShowMenu(false); void handleTranslate(); }}
                      className="w-full text-left px-4 py-2.5 text-xs text-text-secondary hover:bg-accent/8 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <span className="text-[10px]">🌐</span>
                      {translating ? "Translating..." : translatedText ? "Original" : "Translate"}
                    </button>
                  )}
                  {isAuthor && (
                    <button
                      onClick={() => { setShowMenu(false); handleToggleComments(); }}
                      className="w-full text-left px-4 py-2.5 text-xs text-text-secondary hover:bg-accent/8 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <MessageCircle size={12} />
                      {commentsEnabled ? "Turn off comments" : "Turn on comments"}
                    </button>
                  )}
                  {!reported && (
                    <button
                      onClick={() => { setShowMenu(false); setShowReport(true); }}
                      className="w-full text-left px-4 py-2.5 text-xs text-text-secondary hover:bg-accent/8 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <Flag size={12} />
                      Report
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <div className="max-w-md mx-auto">
          {/* Location + time */}
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={12} className="text-text-dim" />
            <p className="text-text-muted text-xs uppercase tracking-[0.15em]">
              {prayer.city || "Unknown"}, {prayer.country}
            </p>
          </div>
          {prayer.createdAt && (
            <p className="text-text-muted text-[11px] mb-5">
              {timeAgo(prayer.createdAt)}
            </p>
          )}

          {/* Full prayer text */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-text font-heading mb-2"
            style={{ fontSize: "1.2rem", lineHeight: 1.8, fontWeight: 300 }}
          >
            {translatedText || renderHashtags(prayer.text, (tag) => {
              void navigate(`/feed?search=${encodeURIComponent(tag)}`);
            })}
          </motion.p>
          {translatedText && sourceLang && (
            <p className="text-text-dim text-[10px] mb-6">
              Translated from {langName[sourceLang] || sourceLang}
            </p>
          )}

          {/* Attribution */}
          <div className="flex items-center gap-2.5 mb-4">
            <img
              src={getInitialAvatarUrl(getAttributionText(prayer))}
              alt={username || "User"}
              className="w-6 h-6 rounded-full object-cover flex-shrink-0 cursor-pointer"
              onClick={() => username && void navigate(`/user/${encodeURIComponent(username)}`)}
            />
            <button
              onClick={() => username && void navigate(`/user/${encodeURIComponent(username)}`)}
              className="text-text-muted text-sm hover:text-text-muted transition-colors cursor-pointer"
            >
              {getAttributionText(prayer)}
            </button>
            {username && (
              <button
                onClick={handleFollowToggle}
                className="text-xs px-2.5 py-1 rounded-full transition-all cursor-pointer"
                style={{
                  background: following ? "rgba(var(--rgb-accent), 0.1)" : "rgba(var(--rgb-accent), 0.04)",
                  border: `1px solid ${following ? "rgba(var(--rgb-accent), 0.2)" : "rgba(var(--rgb-accent), 0.08)"}`,
                  color: following ? "rgb(var(--rgb-accent))" : "rgb(var(--rgb-text-dim))",
                }}
              >
                {following ? "Following" : "Follow"}
              </button>
            )}
          </div>

          {/* Prayer count + comments indicator */}
          <div className="flex items-center gap-3 text-text-muted text-xs mb-8">
            {!commentsEnabled && (
              <span className="flex items-center gap-1 text-text-dim">
                <MessageCircle size={11} />
                <span>Comments off</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-text-muted text-xs mb-8">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                background: "rgb(var(--rgb-accent))",
                boxShadow: "0 0 6px rgba(var(--rgb-accent), 0.5)",
              }}
            />
            <span>{(() => { const c = (prayer.prayerCount ?? 0) + (isPrayed ? 1 : 0); return `${c} ${c === 1 ? "person prayed" : "people prayed"}`; })()}</span>
          </div>

          {/* Pray button */}
          <div className="flex justify-center mb-4">
            <motion.button
              onClick={() => togglePrayed(prayer.id)}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2.5 px-8 py-3 rounded-full text-sm transition-all duration-500 cursor-pointer"
              style={{
                background: isPrayed
                  ? "rgba(var(--rgb-accent), 0.12)"
                  : "linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))",
                color: isPrayed ? "rgb(var(--rgb-accent))" : "rgb(var(--rgb-text))",
                boxShadow: isPrayed
                  ? "none"
                  : "0 4px 24px rgba(var(--rgb-accent), 0.25), 0 0 0 1px rgba(var(--rgb-accent), 0.1)",
              }}
            >
              <span className="text-base">🙏</span>
              {isPrayed ? "Prayed for this" : "Pray for this"}
            </motion.button>
          </div>

          {reported && (
            <div className="flex justify-center mb-8">
              <span className="text-text-dim text-[11px]">Reported</span>
            </div>
          )}

          {/* Comments section */}
          <div className="border-t border-accent/8 pt-4">
            {commentsEnabled ? (
              <CommentSection
                prayer={prayer}
                commentCount={commentCount}
                onCommentCountChange={setCommentCount}
              />
            ) : (
              <div className="text-center py-6">
                <MessageCircle size={20} className="text-text-dim mx-auto mb-2" />
                <p className="text-text-muted text-xs">Comments are disabled for this prayer</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report dialog */}
      {createPortal(
        <AnimatePresence>
          {showReport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              style={{ background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowReport(false)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                className="w-full max-w-sm rounded-2xl p-5 border border-accent/10"
                style={{ background: "rgba(var(--rgb-surface), 0.98)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-text-secondary text-sm">Why are you reporting this?</p>
                  <button
                    onClick={() => setShowReport(false)}
                    className="text-text-faint hover:text-text-muted transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {["Spam or fake", "Upsetting or graphic", "Harmful or unsafe", "Something else"].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => void handleReport(reason)}
                      className="w-full text-left px-4 py-3 rounded-xl text-xs text-text-muted hover:text-text-secondary hover:bg-accent/8 border border-accent/6 transition-all cursor-pointer"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
