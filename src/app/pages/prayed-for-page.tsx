import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Heart } from "lucide-react";
import { Drawer } from "vaul";
import { useNavigate } from "react-router";
import type { PrayerRequest } from "../data/prayer-data";
import { getPrayedForPrayers } from "../data/profile-data";
import { PrayerRow } from "./profile";

export function PrayedForPage() {
  const navigate = useNavigate();
  const prayers = useMemo(() => getPrayedForPrayers(), []);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);

  const handleOpenPrayer = (prayer: PrayerRequest) => {
    setSelectedPrayer(prayer);
    // TODO: Open drawer similar to profile.tsx
  };

  return (
    <div className="w-full h-full flex flex-col" style={{ background: "#0A1A3A" }}>
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(124, 143, 255, 0.04), transparent 70%)",
        }}
      />

      <div className="relative z-10 px-5 pt-8 pb-24 overflow-y-auto flex-1 h-full">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-[#e2e4f0] font-heading text-lg mb-2">Prayers You've Prayed For</h2>
            <p className="text-[#6b7499] text-sm">
              {prayers.length} {prayers.length === 1 ? 'prayer' : 'prayers'} prayed for
            </p>
          </div>

          {/* Prayer list */}
          <div className="space-y-2.5">
            {prayers.length > 0 ? (
              prayers.map((prayer, i) => (
                <PrayerRow
                  key={prayer.id}
                  prayer={prayer}
                  index={i}
                  showCount={false}
                  canManage={false}
                  onTap={handleOpenPrayer}
                />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 rounded-xl"
                style={{
                  background: "rgba(17, 26, 58, 0.4)",
                  border: "1px solid rgba(124,143,255,0.05)",
                }}
              >
                <Heart size={24} className="text-[#4e5573] mx-auto mb-3" />
                <p className="text-[#6b7499] text-sm mb-1">No prayers prayed for yet</p>
                <p className="text-[#4e5573] text-xs">
                  Pray for someone in the feed to see them here
                </p>
                <button
                  onClick={() => navigate('/feed')}
                  className="mt-4 px-5 py-2.5 rounded-full text-sm text-[#a78bfa] bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.12)] cursor-pointer hover:bg-[rgba(167,139,250,0.12)] transition-all"
                >
                  Browse Feed
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Prayer Action Drawer (simplified) */}
      <Drawer.Root
        open={!!selectedPrayer}
        onOpenChange={(o) => {
          if (!o) setSelectedPrayer(null);
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
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[rgba(124,143,255,0.2)]" />
            </div>
            <div className="max-w-md w-full mx-auto p-6 pt-2 flex-1 overflow-auto text-center">
              {selectedPrayer && (
                <div>
                  <p className="text-[#e2e4f0] mb-4">Prayer options would appear here</p>
                  <button
                    onClick={() => setSelectedPrayer(null)}
                    className="px-6 py-2.5 rounded-full text-sm text-[#8b96c0] bg-[rgba(124,143,255,0.06)] border border-[rgba(124,143,255,0.1)] hover:bg-[rgba(124,143,255,0.12)] transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}