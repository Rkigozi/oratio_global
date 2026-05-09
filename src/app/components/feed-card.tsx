import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, MoreHorizontal, X, Bookmark, Flag } from "lucide-react";
import type { PrayerRequest } from "../data/prayer-data";
import { timeAgo, getAttributionText } from "../data/prayer-data";
import { categoryColors } from "../data/profile-data";

const reportReasons = ["Spam or fake", "Upsetting or graphic", "Harmful or unsafe", "Something else"];

interface FeedCardProps {
  prayer: PrayerRequest;
  index: number;
  hasPrayed: boolean;
  onPrayed: (id: string) => void;
  onTap: (prayer: PrayerRequest) => void;
}


export function FeedCard({ prayer, index, hasPrayed, onPrayed, onTap }: FeedCardProps) {
  const [prayed, setPrayed] = useState(hasPrayed);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reported, setReported] = useState(() => {
    try {
      const reports = JSON.parse(localStorage.getItem("oratio_reports") || "[]") as Array<{prayerId: string}>;
      return reports.some(r => r.prayerId === prayer.id);
    } catch { return false; }
  });
  const [saved, setSaved] = useState(() => {
    try {
      const savedIds = JSON.parse(localStorage.getItem("oratio_saved") || "[]") as string[];
      return savedIds.includes(prayer.id);
    } catch { return false; }
  });

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrayed(hasPrayed);
  }, [hasPrayed, prayer.id]);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  const handlePray = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPrayed = !prayed;
    setPrayed(newPrayed);
    onPrayed(prayer.id);
  };

  const toggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    const newSaved = !saved;
    setSaved(newSaved);
    try {
      const savedIds = JSON.parse(localStorage.getItem("oratio_saved") || "[]") as string[];
      if (newSaved) {
        savedIds.push(prayer.id);
      } else {
        const idx = savedIds.indexOf(prayer.id);
        if (idx > -1) savedIds.splice(idx, 1);
      }
      localStorage.setItem("oratio_saved", JSON.stringify(savedIds));
    } catch { /* ignore */ }
  };

  const openReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowReport(true);
  };

  const submitReport = (reason: string) => {
    setReported(true);
    try {
      const reports = JSON.parse(localStorage.getItem("oratio_reports") || "[]") as Array<{prayerId: string; reason: string; timestamp: number}>;
      reports.push({ prayerId: prayer.id, reason, timestamp: Date.now() });
      localStorage.setItem("oratio_reports", JSON.stringify(reports));
    } catch { /* ignore */ }
  };

  const catColor = categoryColors[prayer.category || "Other"] || "#8890b5";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.6), duration: 0.4 }}
      onClick={() => onTap(prayer)}
      className="rounded-2xl p-4 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform duration-150"
      style={{
        background:
          "linear-gradient(160deg, rgba(17, 26, 58, 0.7), rgba(12, 18, 48, 0.5))",
        border: "1px solid rgba(124,143,255,0.07)",
      }}
    >
      {/* Top row: location + time + menu */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin size={12} className="text-[#5a6080] flex-shrink-0" />
          <span className="text-[#8890b5] text-xs truncate">
            {prayer.city}, {prayer.country}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {reported && <Flag size={10} className="text-[#ff6b6b] opacity-50" />}
          <span className="text-[#3e4460] text-xs">
            {prayer.createdAt ? timeAgo(prayer.createdAt) : ""}
          </span>
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="text-[#3e4460] hover:text-[#6b7499] transition-colors cursor-pointer p-0.5"
            >
              <MoreHorizontal size={14} />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-[rgba(124,143,255,0.1)] overflow-hidden z-30"
                  style={{
                    background: "rgba(12, 20, 48, 0.98)",
                    backdropFilter: "blur(16px)",
                  }}
                >
                  <button
                    onClick={toggleSave}
                    className="w-full text-left px-4 py-2.5 text-xs text-[#c5cdff] hover:bg-[rgba(124,143,255,0.08)] transition-colors cursor-pointer"
                  >
                    {saved ? "Remove from saved" : "Save"}
                  </button>
                  <button
                    onClick={openReport}
                    className="w-full text-left px-4 py-2.5 text-xs text-[#c5cdff] hover:bg-[rgba(124,143,255,0.08)] transition-colors cursor-pointer"
                  >
                    Report
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>



      {/* Prayer text — clamped to 3 lines */}
      <p
        className="text-[#d0d4e8] mb-3 line-clamp-3"
        style={{ fontSize: "0.95rem", lineHeight: 1.7 }}
      >
        {prayer.text}
      </p>

       {/* Bottom row: name + category + pray button */}
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-2.5">
            <span className="text-[#6b7499] text-xs">
              {getAttributionText(prayer)}
            </span>
          {prayer.category && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{
                color: catColor,
                background: `${catColor}15`,
                border: `1px solid ${catColor}20`,
              }}
            >
              {prayer.category}
            </span>
          )}
          {saved && (
            <Bookmark size={11} className="text-[#5a6080]" fill="#5a6080" />
          )}
        </div>

        <button
          onClick={handlePray}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 cursor-pointer"
          style={{
            background: prayed
              ? "rgba(124, 143, 255, 0.1)"
              : "rgba(124, 143, 255, 0.06)",
            border: `1px solid ${
              prayed ? "rgba(124, 143, 255, 0.2)" : "rgba(124, 143, 255, 0.1)"
            }`,
          }}
        >
          <span className={`text-sm transition-all duration-300 ${prayed ? "opacity-100" : "opacity-60"}`}>
            🙏
          </span>
          <span
            className="text-xs transition-colors duration-300"
            style={{ color: prayed ? "#7c8fff" : "#6b7499" }}
          >
             {prayer.prayerCount}
          </span>
        </button>
      </div>

      {/* Report dialog — rendered at document body level */}
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
                {!reported ? (
                  <>
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
                      {reportReasons.map((reason) => (
                        <button
                          key={reason}
                          onClick={() => submitReport(reason)}
                          className="w-full text-left px-4 py-3 rounded-xl text-xs text-[#8890b5] hover:text-[#c5cdff] hover:bg-[rgba(124,143,255,0.08)] border border-[rgba(124,143,255,0.06)] transition-all cursor-pointer"
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-[#8890b5] text-sm text-center py-6">
                    Thanks for looking out for this community.
                  </p>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}
