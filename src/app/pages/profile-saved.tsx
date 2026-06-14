import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bookmark, MapPin } from "lucide-react";
import { Drawer } from "vaul";
import { useNavigate } from "react-router";
import { timeAgo, getAttributionText } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";
import { categoryColors } from "../data/profile-data";
import { getSavedPrayers, toggleSavePrayer } from "../../lib/supabase-queries";
import { LoadingSpinner } from "../components/loading-spinner";

export function ProfileSaved() {
  const navigate = useNavigate();
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
  const [savedPrayers, setSavedPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSavedPrayers().then((prayers) => {
      setLoading(false);
      if (prayers.length > 0) {
        setSavedPrayers(prayers);
      } else {
        // Fallback to localStorage
        let savedIds: string[] = [];
        try { savedIds = JSON.parse(localStorage.getItem("oratio_saved") || "[]") as string[]; }
        catch { savedIds = []; }
        let submitted: PrayerRequest[] = [];
        try { submitted = JSON.parse(localStorage.getItem("oratio_submitted_prayers") || "[]") as PrayerRequest[]; }
        catch { submitted = []; }
        const allPrayers = submitted;
        setSavedPrayers(allPrayers.filter((p) => savedIds.includes(p.id)));
      }
      setLoading(false);
    });
  }, []);

  const removeSaved = (prayerId: string) => {
    void toggleSavePrayer(prayerId, false);
    try {
      const savedIds = JSON.parse(localStorage.getItem("oratio_saved") || "[]") as string[];
      const idx = savedIds.indexOf(prayerId);
      if (idx > -1) savedIds.splice(idx, 1);
      localStorage.setItem("oratio_saved", JSON.stringify(savedIds));
    } catch { /* ignore */ }
    setSelectedPrayer(null);
    setSavedPrayers((prev) => prev.filter((p) => p.id !== prayerId));
  };

  return (
    <div
      className="w-full min-h-full flex flex-col px-6 pb-28"
      style={{ background: "rgb(var(--rgb-bg))" }}
    >
      <div className="flex-1 overflow-y-auto pt-24">
        {loading ? (
          <LoadingSpinner text="Loading saved prayers..." />
        ) : savedPrayers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Bookmark size={24} className="text-text-dim mx-auto mb-3" />
            <p className="text-text-muted text-sm mb-1">No saved prayers yet</p>
            <p className="text-text-dim text-xs mb-4">
              Tap &#8942; on a prayer in the feed and select Save
            </p>
            <button
              onClick={() => void navigate('/feed')}
              className="px-5 py-2 rounded-full text-xs text-accent bg-accent/8 border border-accent/12 cursor-pointer hover:bg-accent/12 transition-all"
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
                  className="rounded-xl px-4 py-3.5 cursor-pointer active:bg-accent/5 transition-colors duration-150"
                  style={{
                    background: "linear-gradient(160deg, rgba(var(--rgb-surface), 0.6), rgba(var(--rgb-surface), 0.4))",
                    border: "1px solid rgba(var(--rgb-accent), 0.06)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-text-secondary line-clamp-2 mb-1"
                        style={{ fontSize: "0.85rem", lineHeight: 1.6 }}
                      >
                        {prayer.text}
                      </p>
                      <span className="text-text-muted text-[11px] mb-1 block">
                        {getAttributionText(prayer)}
                      </span>
                      <div className="flex items-center gap-2">
                        <MapPin size={10} className="text-text-dim" />
                        <span className="text-text-dim text-[11px]">{prayer.city}</span>
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
                          <span className="text-text-muted text-[10px] ml-auto">
                            {timeAgo(prayer.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Bookmark size={12} className="text-text-dim flex-shrink-0 mt-1" fill="#5a6080" />
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
              background: "linear-gradient(180deg, rgb(var(--rgb-surface)), rgb(var(--rgb-surface)))",
              borderTop: "1px solid rgba(var(--rgb-accent), 0.1)",
            }}
          >
            <Drawer.Title className="sr-only">Saved Prayer</Drawer.Title>
            <Drawer.Description className="sr-only">
              View saved prayer details
            </Drawer.Description>

            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-accent/20" />
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
                      <MapPin size={12} className="text-text-dim" />
                      <p className="text-text-muted text-xs">
                        {selectedPrayer.city}, {selectedPrayer.country}
                      </p>
                    </div>
                    {selectedPrayer.createdAt && (
                      <p className="text-text-muted text-[11px] mb-5 text-center">
                        {timeAgo(selectedPrayer.createdAt)}
                      </p>
                    )}

                    <p
                      className="text-text-secondary text-center mb-4"
                      style={{ fontSize: "0.95rem", lineHeight: 1.7 }}
                    >
                      {selectedPrayer.text}
                    </p>

                    <p className="text-text-dim text-xs text-center mb-2">
                      {getAttributionText(selectedPrayer)}
                    </p>

                    <div className="flex items-center gap-1.5 justify-center text-text-dim text-xs mb-6">
                      <span className="text-xs opacity-60">🙏</span>
                      <span>{selectedPrayer.prayerCount} {selectedPrayer.prayerCount === 1 ? "person" : "people"} prayed</span>
                    </div>

                    <button
                      onClick={() => removeSaved(selectedPrayer.id)}
                      className="w-full py-3 rounded-full text-sm text-text-muted border border-accent/15 hover:text-danger hover:border-danger/30 transition-all cursor-pointer"
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
