import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bookmark, MapPin } from "lucide-react";
import { Drawer } from "vaul";
import { useNavigate } from "react-router";
import { timeAgo, getAttributionText } from "../data/prayer-data";
import { mockFeedPrayers } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";
import { categoryColors } from "../data/profile-data";

export function ProfileSaved() {
  const navigate = useNavigate();
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
  const [version, setVersion] = useState(0);

  const savedPrayers = useMemo(() => {
    let savedIds: string[] = [];
    try { savedIds = JSON.parse(localStorage.getItem("oratio_saved") || "[]") as string[]; }
    catch { savedIds = []; }

    let submitted: PrayerRequest[] = [];
    try { submitted = JSON.parse(localStorage.getItem("oratio_submitted_prayers") || "[]") as PrayerRequest[]; }
    catch { submitted = []; }

    const allPrayers = [...submitted, ...mockFeedPrayers];
    return allPrayers.filter((p) => savedIds.includes(p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const removeSaved = (prayerId: string) => {
    try {
      const savedIds = JSON.parse(localStorage.getItem("oratio_saved") || "[]") as string[];
      const idx = savedIds.indexOf(prayerId);
      if (idx > -1) savedIds.splice(idx, 1);
      localStorage.setItem("oratio_saved", JSON.stringify(savedIds));
    } catch { /* ignore */ }
    setSelectedPrayer(null);
    setVersion(v => v + 1);
  };

  return (
    <div
      className="w-full min-h-full flex flex-col px-6 pb-28"
      style={{ background: "#0A1A3A" }}
    >
      <div className="flex-1 overflow-y-auto pt-24">
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
              onClick={() => void navigate('/feed')}
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
                  onClick={() => setSelectedPrayer(prayer)}
                  className="rounded-xl px-4 py-3.5 cursor-pointer active:bg-[rgba(124,143,255,0.05)] transition-colors duration-150"
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
                          <span className="text-[#6b7499] text-[10px] ml-auto">
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

      {/* Prayer Detail Drawer */}
      <Drawer.Root
        open={!!selectedPrayer}
        onOpenChange={(o) => { if (!o) setSelectedPrayer(null); }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[600]" />
          <Drawer.Content
            className="flex flex-col rounded-t-[1.5rem] fixed bottom-0 left-0 right-0 z-[600] max-h-[85vh] focus:outline-none"
            style={{
              background: "linear-gradient(180deg, #111a3a, #0c1230)",
              borderTop: "1px solid rgba(124, 143, 255, 0.1)",
            }}
          >
            <Drawer.Title className="sr-only">Saved Prayer</Drawer.Title>
            <Drawer.Description className="sr-only">
              View saved prayer details
            </Drawer.Description>

            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[rgba(124,143,255,0.2)]" />
            </div>

            <div className="max-w-md w-full mx-auto p-6 pt-2 flex-1 overflow-auto">
              {selectedPrayer && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key="detail"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center gap-2 mb-1 justify-center">
                      <MapPin size={12} className="text-[#5a6080]" />
                      <p className="text-[#6b7499] text-xs">
                        {selectedPrayer.city}, {selectedPrayer.country}
                      </p>
                    </div>
                    {selectedPrayer.createdAt && (
                      <p className="text-[#6b7499] text-[11px] mb-5 text-center">
                        {timeAgo(selectedPrayer.createdAt)}
                      </p>
                    )}

                    <p
                      className="text-[#d0d4e8] text-center mb-4"
                      style={{ fontSize: "0.95rem", lineHeight: 1.7 }}
                    >
                      {selectedPrayer.text}
                    </p>

                    <p className="text-[#5a6080] text-xs text-center mb-2">
                      {getAttributionText(selectedPrayer)}
                    </p>

                    <div className="flex items-center gap-1.5 justify-center text-[#5a6080] text-xs mb-6">
                      <span className="text-xs opacity-60">🙏</span>
                      <span>{selectedPrayer.prayerCount} {selectedPrayer.prayerCount === 1 ? "person" : "people"} prayed</span>
                    </div>

                    <button
                      onClick={() => removeSaved(selectedPrayer.id)}
                      className="w-full py-3 rounded-full text-sm text-[#6b7499] border border-[rgba(124,143,255,0.15)] hover:text-[#ff6b6b] hover:border-[rgba(255,107,107,0.3)] transition-all cursor-pointer"
                    >
                      Remove from saved
                    </button>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
