import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, MapPin } from "lucide-react";
import { Drawer } from "vaul";
import { useNavigate } from "react-router";
import { timeAgo } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";
import {
  getPrayedIds,
  getPrayedForPrayers,
  categoryColors,
} from "../data/profile-data";

export function ProfilePrayed() {
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  
  // Prayer detail / action drawer
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
  
  const prayedIds = getPrayedIds();
  const myPrayed = useMemo(() => {
    return getPrayedForPrayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prayedIds, version]);

  const handleOpenPrayer = (prayer: PrayerRequest) => {
    setSelectedPrayer(prayer);
  };

  const togglePrayed = (id: string) => {
    try {
      const prayedIds = JSON.parse(localStorage.getItem("oratio_prayed") || "[]") as string[];
      const isCurrentlyPrayed = prayedIds.includes(id);
      const newPrayed = !isCurrentlyPrayed;

      // Update prayed IDs in localStorage
      if (newPrayed && !prayedIds.includes(id)) {
        localStorage.setItem("oratio_prayed", JSON.stringify([...prayedIds, id]));
      } else if (!newPrayed && prayedIds.includes(id)) {
        localStorage.setItem("oratio_prayed", JSON.stringify(prayedIds.filter(pId => pId !== id)));
      }

      // Update prayer count in submitted prayers storage
      const submittedPrayers = JSON.parse(localStorage.getItem("oratio_submitted_prayers") || "[]") as PrayerRequest[];
      const updated = submittedPrayers.map(p => 
        p.id === id ? { ...p, prayerCount: p.prayerCount + (newPrayed ? 1 : -1) } : p
      );
      localStorage.setItem("oratio_submitted_prayers", JSON.stringify(updated));

      // Force re-render
      setVersion(v => v + 1);
    } catch (error) {
      console.error("Failed to toggle prayed:", error);
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ background: "#0A1A3A" }}
    >
      {/* Scrollable content */}
      <div className="flex-1 px-4 pb-28 overflow-y-auto pt-24">
        {myPrayed.length > 0 ? (
          <div className="space-y-2.5">
            {myPrayed.map((prayer, i) => (
              <PrayerRow
                key={prayer.id}
                prayer={prayer}
                index={i}
                showCount={true}
                canManage={false}
                onTap={handleOpenPrayer}
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
              background: "rgba(17, 26, 58, 0.4)",
              border: "1px solid rgba(124,143,255,0.05)",
            }}
          >
            <Heart size={20} className="text-[#4e5573] mx-auto mb-2" />
            <p className="text-[#6b7499] text-sm mb-1">No prayers yet</p>
            <p className="text-[#4e5573] text-xs">
              Pray for someone to see them here
            </p>
            <button
              onClick={() => void navigate('/feed')}
              className="mt-3 px-4 py-2 rounded-full text-xs text-[#7c8fff] bg-[rgba(124,143,255,0.08)] border border-[rgba(124,143,255,0.12)] cursor-pointer hover:bg-[rgba(124,143,255,0.12)] transition-all"
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
              background: "linear-gradient(180deg, #111a3a, #0c1230)",
              borderTop: "1px solid rgba(124, 143, 255, 0.1)",
            }}
          >
            <Drawer.Title className="sr-only">Prayer Options</Drawer.Title>
            <Drawer.Description className="sr-only">
              View prayer details
            </Drawer.Description>

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[rgba(124,143,255,0.2)]" />
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
                      <MapPin size={12} className="text-[#5a6080]" />
                      <p className="text-[#6b7499] text-xs">
                        {selectedPrayer.city}, {selectedPrayer.country}
                      </p>
                    </div>
                    {selectedPrayer.createdAt && (
                      <p className="text-[#3e4460] text-[11px] mb-5 text-center">
                        {timeAgo(selectedPrayer.createdAt)}
                      </p>
                    )}

                    <p
                      className="text-[#d0d4e8] text-center mb-3 max-w-xs mx-auto"
                      style={{ fontSize: "0.95rem", lineHeight: 1.7 }}
                    >
                      &ldquo;{selectedPrayer.text}&rdquo;
                    </p>

                    {selectedPrayer.name && (
                      <p className="text-[#5a6080] text-xs text-center mb-2">
                        &mdash; {selectedPrayer.name}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 justify-center text-[#5a6080] text-xs mb-8">
                      <Heart size={11} className="text-[#7c8fff] opacity-60" />
                      <span>{selectedPrayer.prayerCount} people prayed</span>
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

/* ── Compact prayer row for profile lists ────────────────────────────── */
function PrayerRow({
  prayer,
  index,
  showCount,
  canManage,
  onTap,
  hasPrayed = false,
  onTogglePrayed,
  showPrayedToggle = false,
}: {
  prayer: PrayerRequest;
  index: number;
  showCount: boolean;
  canManage: boolean;
  onTap: (prayer: PrayerRequest) => void;
  hasPrayed?: boolean;
  onTogglePrayed?: (id: string) => void;
  showPrayedToggle?: boolean;
}) {
  const catColor =
    categoryColors[prayer.category || "Other"] || "#8890b5";

  const [prayed, setPrayed] = useState(hasPrayed);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrayed(hasPrayed);
  }, [hasPrayed, prayer.id]);

  const handlePray = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPrayed = !prayed;
    setPrayed(newPrayed);
    if (onTogglePrayed) {
      onTogglePrayed(prayer.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.5), duration: 0.35 }}
      onClick={canManage ? () => onTap(prayer) : undefined}
      className={`rounded-xl px-4 py-3.5 relative overflow-hidden ${canManage ? "cursor-pointer active:scale-[0.98] transition-transform duration-150" : ""}`}
      style={{
        background:
          "linear-gradient(160deg, rgba(17, 26, 58, 0.6), rgba(12, 18, 48, 0.4))",
        border: "1px solid rgba(124,143,255,0.06)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p
            className="text-[#d0d4e8] line-clamp-2 mb-2"
            style={{ fontSize: "0.85rem", lineHeight: 1.6 }}
          >
            &ldquo;{prayer.text}&rdquo;
          </p>
          <div className="flex items-center gap-2">
            <MapPin size={10} className="text-[#5a6080] flex-shrink-0" />
            <span className="text-[#5a6080] text-[11px]">
              {prayer.city}
            </span>
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

        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          {showCount && (
            <div className="flex items-center gap-1">
              <Heart size={11} className="text-[#7c8fff] opacity-60" />
              <span className="text-[#6b7499] text-[11px]">
                {prayer.prayerCount}
              </span>
            </div>
          )}
          {showPrayedToggle && onTogglePrayed && (
            <button
              onClick={handlePray}
              className="flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-300 cursor-pointer"
              style={{
                background: prayed
                  ? "rgba(124, 143, 255, 0.1)"
                  : "rgba(124, 143, 255, 0.06)",
                border: `1px solid ${
                  prayed ? "rgba(124, 143, 255, 0.2)" : "rgba(124, 143, 255, 0.1)"
                }`,
              }}
              title={prayed ? "Unpray" : "Pray"}
            >
              <Heart
                size={11}
                className="transition-all duration-300"
                fill={prayed ? "#7c8fff" : "transparent"}
                color={prayed ? "#7c8fff" : "#6b7499"}
              />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}