import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { ArrowLeft, MapPin, X, MoreHorizontal, Share2, Flag, Bookmark } from "lucide-react";
import { mockFeedPrayers, timeAgo, getAttributionText } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";
import { getPrayedIds } from "../data/profile-data";
import { CommentSection } from "../components/comment-section";
import { getInitialAvatarUrl } from "../../lib/upload";
import { reportContent } from "../../lib/api";
import { renderHashtags } from "../../lib/hashtags";
import { translateText } from "../../lib/translate";

function findPrayer(id: string): PrayerRequest | undefined {
  try {
    const submitted = JSON.parse(localStorage.getItem("oratio_submitted_prayers") || "[]") as PrayerRequest[];
    const all = [...submitted, ...mockFeedPrayers];
    return all.find((p) => p.id === id);
  } catch {
    return mockFeedPrayers.find((p) => p.id === id);
  }
}

export function PrayerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const prayer = useMemo(() => id ? findPrayer(id) : undefined, [id]);
  const [prayedIds, setPrayedIds] = useState<string[]>(() => getPrayedIds());
  const [commentCount, setCommentCount] = useState(0);
  const [saved, setSaved] = useState(() => {
    try {
      const ids = JSON.parse(localStorage.getItem("oratio_saved") || "[]") as string[];
      return prayer ? ids.includes(prayer.id) : false;
    } catch { return false; }
  });
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reported, setReported] = useState(false);

  const handleTranslate = async () => {
    if (!prayer || translating) return;
    if (translatedText) { setTranslatedText(null); return; }
    setTranslating(true);
    const result = await translateText(prayer.text);
    if (result) setTranslatedText(result);
    setTranslating(false);
  };

  const toggleSave = () => {
    const newSaved = !saved;
    setSaved(newSaved);
    try {
      const ids = JSON.parse(localStorage.getItem("oratio_saved") || "[]") as string[];
      if (newSaved) {
        ids.push(prayer!.id);
      } else {
        const idx = ids.indexOf(prayer!.id);
        if (idx > -1) ids.splice(idx, 1);
      }
      localStorage.setItem("oratio_saved", JSON.stringify(ids));
    } catch { /* ignore */ }
  };

  const handleReport = async (reason: string) => {
    setReported(true);
    setShowReport(false);
    try {
      await reportContent({ reportable_type: "prayer", reportable_id: prayer!.id, reason });
    } catch {
      try {
        const reports = JSON.parse(localStorage.getItem("oratio_reports") || "[]") as Array<{prayerId: string; reason: string; timestamp: number}>;
        reports.push({ prayerId: prayer!.id, reason, timestamp: new Date().getTime() });
        localStorage.setItem("oratio_reports", JSON.stringify(reports));
      } catch { /* ignore */ }
    }
  };

  const isPrayed = prayer ? prayedIds.includes(prayer.id) : false;

  const togglePrayed = useCallback((prayerId: string) => {
    setPrayedIds((prev) => {
      const isCurrentlyPrayed = prev.includes(prayerId);
      const newIds = isCurrentlyPrayed
        ? prev.filter((pid) => pid !== prayerId)
        : [...prev, prayerId];
      try {
        localStorage.setItem("oratio_prayed", JSON.stringify(newIds));
      } catch { /* ignore */ }
      return newIds;
    });
  }, []);

  const handleShare = async () => {
    if (!prayer) return;
    const url = `${window.location.origin}/prayer/${prayer.id}`;
    const attribution = getAttributionText(prayer);
    const shareText = `🙏 Prayer request${attribution ? ` from ${attribution}` : ""}:\n\n"${prayer.text}"\n\n${prayer.prayerCount} people have prayed.\n${url}`;
    if (navigator.share) {
      try { await navigator.share({ text: shareText }); } catch { /* ignore */ }
    } else {
      try { await navigator.clipboard.writeText(shareText); } catch { /* ignore */ }
    }
  };

  if (!prayer) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full" style={{ background: "#0A1A3A" }}>
        <p className="text-[#6b7499] text-sm mb-4">Prayer not found</p>
        <button
          onClick={() => void navigate("/feed")}
          className="px-5 py-2 rounded-full text-xs text-[#7c8fff] bg-[rgba(124,143,255,0.08)] border border-[rgba(124,143,255,0.12)] cursor-pointer"
        >
          Back to Feed
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: "#0A1A3A" }}
    >
      {/* Header with back button + menu */}
      <div
        className="flex-shrink-0 pt-[max(1.5rem,env(safe-area-inset-top))] pb-2 px-4"
        style={{
          background: "linear-gradient(to bottom, rgba(10, 26, 58, 0.98), rgba(10, 26, 58, 0))",
        }}
      >
        <div className="flex items-center justify-between mt-12">
          <button
            onClick={() => void navigate(-1)}
            className="flex items-center gap-2 text-[#6b7499] hover:text-[#8890b5] transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span className="text-xs">Back</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[#4e5573] hover:text-[#6b7499] hover:bg-[rgba(124,143,255,0.06)] transition-all cursor-pointer"
            >
              <MoreHorizontal size={16} />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-[rgba(124,143,255,0.1)] overflow-hidden z-30"
                  style={{
                    background: "rgba(12, 20, 48, 0.98)",
                    backdropFilter: "blur(16px)",
                  }}
                >
                  <button
                    onClick={() => { setShowMenu(false); handleShare(); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-[#c5cdff] hover:bg-[rgba(124,143,255,0.08)] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Share2 size={12} />
                    Share
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); toggleSave(); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-[#c5cdff] hover:bg-[rgba(124,143,255,0.08)] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Bookmark size={12} fill={saved ? "#c5cdff" : "none"} />
                    {saved ? "Saved" : "Save"}
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); void handleTranslate(); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-[#c5cdff] hover:bg-[rgba(124,143,255,0.08)] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-[10px]">🌐</span>
                    {translating ? "Translating..." : translatedText ? "Original" : "Translate"}
                  </button>
                  {!reported && (
                    <button
                      onClick={() => { setShowMenu(false); setShowReport(true); }}
                      className="w-full text-left px-4 py-2.5 text-xs text-[#c5cdff] hover:bg-[rgba(124,143,255,0.08)] transition-colors cursor-pointer flex items-center gap-2"
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
            <MapPin size={12} className="text-[#5a6080]" />
            <p className="text-[#6b7499] text-xs uppercase tracking-[0.15em]">
              {prayer.city}, {prayer.country}
            </p>
          </div>
          {prayer.createdAt && (
            <p className="text-[#6b7499] text-[11px] mb-5">
              {timeAgo(prayer.createdAt)}
            </p>
          )}

          {/* Full prayer text */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-[#e2e4f0] font-heading mb-2"
            style={{ fontSize: "1.2rem", lineHeight: 1.8, fontWeight: 300 }}
          >
            {translatedText || renderHashtags(prayer.text, (tag) => {
              void navigate(`/feed?search=%23${tag}`);
            })}
          </motion.p>
          {translatedText && (
            <p className="text-[#4e5573] text-[10px] mb-6">Translated from English</p>
          )}

          {/* Attribution */}
          <div className="flex items-center gap-2.5 mb-4">
            <img
              src={getInitialAvatarUrl(getAttributionText(prayer))}
              alt=""
              className="w-6 h-6 rounded-full object-cover flex-shrink-0"
            />
            <p className="text-[#6b7499] text-sm">
              {getAttributionText(prayer)}
            </p>
          </div>

          {/* Prayer count */}
          <div className="flex items-center gap-1.5 text-[#6b7499] text-xs mb-8">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                background: "#7c8fff",
                boxShadow: "0 0 6px rgba(124,143,255,0.5)",
              }}
            />
            <span>{prayer.prayerCount + (isPrayed ? 1 : 0)} people prayed</span>
          </div>

          {/* Pray button */}
          <div className="flex justify-center mb-4">
            <motion.button
              onClick={() => togglePrayed(prayer.id)}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2.5 px-8 py-3 rounded-full text-sm transition-all duration-500 cursor-pointer"
              style={{
                background: isPrayed
                  ? "rgba(124, 143, 255, 0.12)"
                  : "linear-gradient(135deg, #7c8fff, #5a6fd6)",
                color: isPrayed ? "#7c8fff" : "#ffffff",
                boxShadow: isPrayed
                  ? "none"
                  : "0 4px 24px rgba(124, 143, 255, 0.25), 0 0 0 1px rgba(124,143,255,0.1)",
              }}
            >
              <span className="text-base">🙏</span>
              {isPrayed ? "Prayed for this" : "Pray for this"}
            </motion.button>
          </div>

          {reported && (
            <div className="flex justify-center mb-8">
              <span className="text-[#4e5573] text-[11px]">Reported</span>
            </div>
          )}

          {/* Comments section */}
          <div className="border-t border-[rgba(124,143,255,0.08)] pt-4">
            <CommentSection
              prayer={prayer}
              commentCount={commentCount}
              onCommentCountChange={setCommentCount}
            />
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
                className="w-full max-w-sm rounded-2xl p-5 border border-[rgba(124,143,255,0.1)]"
                style={{ background: "rgba(15, 22, 55, 0.98)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[#c5cdff] text-sm">Why are you reporting this?</p>
                  <button
                    onClick={() => setShowReport(false)}
                    className="text-[#3e4460] hover:text-[#6b7499] transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {["Spam or fake", "Upsetting or graphic", "Harmful or unsafe", "Something else"].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => void handleReport(reason)}
                      className="w-full text-left px-4 py-3 rounded-xl text-xs text-[#8890b5] hover:text-[#c5cdff] hover:bg-[rgba(124,143,255,0.08)] border border-[rgba(124,143,255,0.06)] transition-all cursor-pointer"
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
