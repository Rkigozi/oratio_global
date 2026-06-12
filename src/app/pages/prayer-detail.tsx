import { useState, useCallback, useEffect, useRef } from "react";
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
import { translateText, needsTranslation, detectLanguage } from "../../lib/translate";
import { supabase } from "../../lib/supabase";
import { togglePray } from "../../lib/supabase-queries";

function findPrayer(id: string): PrayerRequest | undefined {
  try {
    const submitted = JSON.parse(localStorage.getItem("oratio_submitted_prayers") || "[]") as PrayerRequest[];
    const all = [...submitted, ...mockFeedPrayers];
    return all.find((p) => p.id === id);
  } catch {
    return mockFeedPrayers.find((p) => p.id === id);
  }
}

async function fetchSupabasePrayer(id: string): Promise<PrayerRequest | undefined> {
  const { data, error } = await supabase
    .from("prayer_requests")
    .select(`
      id, body, category,
      location_city, location_country, location_lat, location_lng,
      is_anonymous, prayer_count, created_at,
      profiles!inner(username, display_name)
    `)
    .eq("id", id)
    .single();

  if (error || !data) return undefined;

  const row = data as Record<string, unknown>;
  const profile = row.profiles as { username: string; display_name: string };
  return {
    id: row.id as string,
    city: (row.location_city as string) || "Unknown",
    country: (row.location_country as string) || "Unknown",
    text: row.body as string,
    name: row.is_anonymous ? undefined : (profile.display_name || profile.username),
    displayName: row.is_anonymous ? undefined : (profile.display_name || profile.username),
    username: row.is_anonymous ? undefined : profile.username,
    prayerCount: (row.prayer_count as number) || 0,
    lat: (row.location_lat as number) || 0,
    lng: (row.location_lng as number) || 0,
    category: (row.category as string) || "Other",
    createdAt: row.created_at as string,
  } as PrayerRequest;
}

export function PrayerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [localPrayer, setLocalPrayer] = useState<PrayerRequest | undefined>(
    () => id ? findPrayer(id) : undefined
  );

  // Try to load from Supabase as well
  useEffect(() => {
    if (!id) return;
    void fetchSupabasePrayer(id).then((supabasePrayer) => {
      if (supabasePrayer) setLocalPrayer(supabasePrayer);
    });
  }, [id]);

  const prayer = localPrayer;
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

  const username = prayer?.username;
  const handleFollowToggle = () => {
    if (!username) return;
    const newState = !following;
    setFollowing(newState);
    try {
      const ids = JSON.parse(localStorage.getItem("oratio_following") || "[]") as string[];
      if (newState) {
        if (!ids.includes(username)) ids.push(username);
      } else {
        const idx = ids.indexOf(username);
        if (idx > -1) ids.splice(idx, 1);
      }
      localStorage.setItem("oratio_following", JSON.stringify(ids));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!username) return;
    try {
      const ids = JSON.parse(localStorage.getItem("oratio_following") || "[]") as string[];
      setFollowing(ids.includes(username));
    } catch { setFollowing(false); }
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
      // Sync to Supabase
      void togglePray(prayerId, !isCurrentlyPrayed);
      return newIds;
    });
  }, []);

  const handleShare = async () => {
    if (!prayer) return;
    const url = `${window.location.origin}/prayer/${prayer.id}`;
    const attribution = getAttributionText(prayer);
    const shareText = `🙏 Prayer request${attribution ? ` from ${attribution}` : ""}:\n\n"${prayer.text}"\n\n${prayer.prayerCount} ${prayer.prayerCount === 1 ? "person has" : "people have"} prayed.\n${url}`;
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
          <div className="relative" ref={menuRef}>
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
                  {showTranslate && (
                    <button
                      onClick={() => { setShowMenu(false); void handleTranslate(); }}
                      className="w-full text-left px-4 py-2.5 text-xs text-[#c5cdff] hover:bg-[rgba(124,143,255,0.08)] transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <span className="text-[10px]">🌐</span>
                      {translating ? "Translating..." : translatedText ? "Original" : "Translate"}
                    </button>
                  )}
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
              void navigate(`/feed?search=${encodeURIComponent(tag)}`);
            })}
          </motion.p>
          {translatedText && sourceLang && (
            <p className="text-[#4e5573] text-[10px] mb-6">
              Translated from {langName[sourceLang] || sourceLang}
            </p>
          )}

          {/* Attribution */}
          <div className="flex items-center gap-2.5 mb-4">
            <img
              src={getInitialAvatarUrl(getAttributionText(prayer))}
              alt=""
              className="w-6 h-6 rounded-full object-cover flex-shrink-0 cursor-pointer"
              onClick={() => username && void navigate(`/user/${encodeURIComponent(username)}`)}
            />
            <button
              onClick={() => username && void navigate(`/user/${encodeURIComponent(username)}`)}
              className="text-[#6b7499] text-sm hover:text-[#8890b5] transition-colors cursor-pointer"
            >
              {getAttributionText(prayer)}
            </button>
            {username && (
              <button
                onClick={handleFollowToggle}
                className="text-xs px-2.5 py-1 rounded-full transition-all cursor-pointer"
                style={{
                  background: following ? "rgba(124,143,255,0.1)" : "rgba(124,143,255,0.04)",
                  border: `1px solid ${following ? "rgba(124,143,255,0.2)" : "rgba(124,143,255,0.08)"}`,
                  color: following ? "#7c8fff" : "#5a6080",
                }}
              >
                {following ? "Following" : "Follow"}
              </button>
            )}
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
            <span>{(() => { const c = prayer.prayerCount + (isPrayed ? 1 : 0); return `${c} ${c === 1 ? "person prayed" : "people prayed"}`; })()}</span>
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
