import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Bookmark, MapPin } from "lucide-react";
import { useNavigate } from "react-router";
import { timeAgo, getAttributionText } from "../data/prayer-data";
import { mockFeedPrayers } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";
import { categoryColors } from "../data/profile-data";

export function ProfileSaved() {
  const navigate = useNavigate();

  const savedPrayers = useMemo(() => {
    let savedIds: string[] = [];
    try { savedIds = JSON.parse(localStorage.getItem("oratio_saved") || "[]") as string[]; }
    catch { savedIds = []; }

    // Get submitted prayers too
    let submitted: PrayerRequest[] = [];
    try { submitted = JSON.parse(localStorage.getItem("oratio_submitted_prayers") || "[]") as PrayerRequest[]; }
    catch { submitted = []; }

    const allPrayers = [...submitted, ...mockFeedPrayers];
    return allPrayers.filter((p) => savedIds.includes(p.id));
  }, []);

  return (
    <div
      className="w-full min-h-full flex flex-col px-6 pt-6 pb-28"
      style={{ background: "#0A1A3A" }}
    >
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => void navigate("/profile")}
          className="text-[#8890b5] hover:text-[#c5cdff] transition-colors cursor-pointer text-sm"
        >
          &larr; Back
        </button>
        <h2 className="text-[#e2e4f0] font-heading text-xl font-light">
          Saved Prayers
        </h2>
      </div>

      {savedPrayers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Bookmark size={24} className="text-[#4e5573] mx-auto mb-3" />
          <p className="text-[#6b7499] text-sm mb-1">No saved prayers yet</p>
          <p className="text-[#4e5573] text-xs mb-4">
            Tap &#8942; on a prayer in the feed and select Save
          </p>
          <button
            onClick={() => void navigate("/feed")}
            className="px-5 py-2 rounded-full text-xs text-[#7c8fff] bg-[rgba(124,143,255,0.08)] border border-[rgba(124,143,255,0.12)] cursor-pointer hover:bg-[rgba(124,143,255,0.12)] transition-all"
          >
            Browse Feed
          </button>
        </motion.div>
      ) : (
        <div className="space-y-2.5">
          {savedPrayers.map((prayer, i) => {
            const catColor = categoryColors[prayer.category || "Other"] || "#8890b5";
            return (
              <motion.div
                key={prayer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.5), duration: 0.35 }}
                className="rounded-xl px-4 py-3.5"
                style={{
                  background: "linear-gradient(160deg, rgba(17, 26, 58, 0.6), rgba(12, 18, 48, 0.4))",
                  border: "1px solid rgba(124,143,255,0.06)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[#d0d4e8] line-clamp-2 mb-1"
                      style={{ fontSize: "0.85rem", lineHeight: 1.6 }}
                    >
                      {prayer.text}
                    </p>
                    <span className="text-[#6b7499] text-[11px] mb-1 block">
                      {getAttributionText(prayer)}
                    </span>
                    <div className="flex items-center gap-2">
                      <MapPin size={10} className="text-[#5a6080]" />
                      <span className="text-[#5a6080] text-[11px]">{prayer.city}</span>
                      {prayer.category && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                          style={{
                            color: catColor,
                            background: `${catColor}12`,
                            border: `1px solid ${catColor}18`,
                          }}
                        >
                          {prayer.category}
                        </span>
                      )}
                      {prayer.createdAt && (
                        <span className="text-[#3e4460] text-[10px] ml-auto">
                          {timeAgo(prayer.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Bookmark size={12} className="text-[#5a6080] flex-shrink-0 mt-1" fill="#5a6080" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
