import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin } from "lucide-react";
import { Drawer } from "vaul";
import { useNavigate } from "react-router";
import { timeAgo, getAttributionText } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";
import { getPrayedIds, getPrayedForPrayers } from "../data/profile-data";
import { PrayerRow } from "../components/prayer-row";
import { getMyPrayedForPrayers, togglePray } from "../../lib/supabase-queries";
import { LoadingSpinner } from "../components/loading-spinner";

export function ProfilePrayed() {
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  
  // Prayer detail / action drawer
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
  
  const [myPrayed, setMyPrayed] = useState<PrayerRequest[]>([]);
  const [prayedIds, setPrayedIds] = useState<string[]>(() => getPrayedIds());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMyPrayedForPrayers().then((prayers) => {
      setLoading(false);
      if (prayers.length > 0) {
        setMyPrayed(prayers);
      } else {
        // Fallback to localStorage
        setMyPrayed(getPrayedForPrayers());
      }
      setLoading(false);
    });
    setPrayedIds(getPrayedIds());
  }, [version]);

  const handleTagClick = (tag: string) => {
    const q = tag.startsWith("#") ? tag : `#${tag}`;
    void navigate(`/feed?search=${encodeURIComponent(q)}`);
  };

  const handleOpenPrayer = (prayer: PrayerRequest) => {
    setSelectedPrayer(prayer);
  };

  const togglePrayed = (id: string) => {
    const isCurrentlyPrayed = prayedIds.includes(id);
    const newPrayed = !isCurrentlyPrayed;
    void togglePray(id, newPrayed);

    try {
      const ids = JSON.parse(localStorage.getItem("oratio_prayed") || "[]") as string[];
      if (newPrayed && !ids.includes(id)) {
        localStorage.setItem("oratio_prayed", JSON.stringify([...ids, id]));
      } else if (!newPrayed && ids.includes(id)) {
        localStorage.setItem("oratio_prayed", JSON.stringify(ids.filter(pId => pId !== id)));
      }
      const submittedPrayers = JSON.parse(localStorage.getItem("oratio_submitted_prayers") || "[]") as PrayerRequest[];
      const updated = submittedPrayers.map(p => 
        p.id === id ? { ...p, prayerCount: p.prayerCount + (newPrayed ? 1 : -1) } : p
      );
      localStorage.setItem("oratio_submitted_prayers", JSON.stringify(updated));
      setVersion(v => v + 1);
    } catch { /* ignore */ }
  };

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ background: "rgb(var(--rgb-bg))" }}
    >
      {/* Scrollable content */}
      <div className="flex-1 px-4 pb-28 overflow-y-auto pt-24">
        {loading ? (
          <LoadingSpinner text="Loading prayed prayers..." />
        ) : myPrayed.length > 0 ? (
          <div className="space-y-2.5">
            {myPrayed.map((prayer, i) => (
              <PrayerRow
                key={prayer.id}
                prayer={prayer}
                index={i}
                showCount={true}
                canManage={true}
                onTap={handleOpenPrayer}
                onTagClick={handleTagClick}
                hasPrayed={prayedIds.includes(prayer.id)}
                onTogglePrayed={togglePrayed}
                showPrayedToggle={true}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 rounded-xl mt-8"
            style={{
              background: "rgba(var(--rgb-surface), 0.4)",
              border: "1px solid rgba(var(--rgb-accent), 0.05)",
            }}
          >
            <span className="text-xl opacity-50 block mb-2">🙏</span>
            <p className="text-text-muted text-sm mb-1">No prayers yet</p>
            <p className="text-text-dim text-xs">
              Pray for someone to see them here
            </p>
            <button
              onClick={() => void navigate('/feed')}
              className="mt-3 px-4 py-2 rounded-full text-xs text-accent bg-accent/8 border border-accent/12 cursor-pointer hover:bg-accent/12 transition-all"
            >
              Browse Feed
            </button>
          </motion.div>
        )}
      </div>

      {/* Prayer Action Drawer */}
      <Drawer.Root
        open={!!selectedPrayer}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedPrayer(null);
          }
        }}
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
            <Drawer.Title className="sr-only">Prayer Options</Drawer.Title>
            <Drawer.Description className="sr-only">
              View prayer details
            </Drawer.Description>

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-accent/20" />
            </div>

            <div className="max-w-md w-full mx-auto p-6 pt-2 flex-1 overflow-auto">
              {selectedPrayer && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key="options"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Prayer preview */}
                    <div className="flex items-center gap-2 mb-1 justify-center">
                      <MapPin size={12} className="text-text-dim" />
                      <p className="text-text-muted text-xs">
                        {(selectedPrayer.city || "Unknown")}, {selectedPrayer.country}
                      </p>
                    </div>
                    {selectedPrayer.createdAt && (
                      <p className="text-text-muted text-[11px] mb-5 text-center">
                        {timeAgo(selectedPrayer.createdAt)}
                      </p>
                    )}

                    <p
                      className="text-text-secondary text-center mb-3 max-w-xs mx-auto"
                      style={{ fontSize: "0.95rem", lineHeight: 1.7 }}
                    >
                      {selectedPrayer.text}
                    </p>

                      <p className="text-text-dim text-xs text-center mb-2">
                        {getAttributionText(selectedPrayer)}
                      </p>

                    <div className="flex items-center gap-1.5 justify-center text-text-dim text-xs mb-8">
                      <span className="text-xs opacity-60">🙏</span>
                      <span>{(selectedPrayer.prayerCount ?? 0)} {(selectedPrayer.prayerCount ?? 0) === 1 ? "person" : "people"} prayed</span>
                    </div>
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

