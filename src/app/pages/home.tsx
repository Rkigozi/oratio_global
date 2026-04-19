import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { WorldMapClean } from "../components/world-map-clean";
import { mockHotspots } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";
import { Heart, ArrowRight, MapPin } from "lucide-react";
import { Drawer } from "vaul";


export function Home() {
  
  const navigate = useNavigate();
   const [prayers, setPrayers] = useState(mockHotspots);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(
    null
  );
   const [centerTrigger, setCenterTrigger] = useState(0);
   const [prayedId, setPrayedId] = useState<string | null>(null);
   const [newPrayerId, setNewPrayerId] = useState<string | null>(null);
   const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);


  const handlePrayerTap = useCallback((prayer: PrayerRequest) => {
    setSelectedPrayer(prayer);
  }, []);



  // Listen for new prayer submissions (via custom event from Submit page)
  // This is wired through the layout via a shared context or event
  // For now we expose a method on window for cross-page communication
  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (window as any).__oratio_addPrayer = (prayer: PrayerRequest) => {
      setPrayers((prev) => [prayer, ...prev]);
      setNewPrayerId(prayer.id);
      setFlyTo({ lat: prayer.lat, lng: prayer.lng });
      setTimeout(() => setNewPrayerId(null), 2000);
    };
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete (window as any).__oratio_addPrayer;
    };
  }, []);

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: "#0A1A3A" }}
    >
       {/* Header hint - Mobile optimized with desktop adjustments */}
       <div className="absolute top-16 md:top-12 left-0 right-0 z-[500] text-center pointer-events-none flex flex-col items-center">
         <motion.p
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.5, duration: 0.8 }}
           className="text-[#7a84a8] text-xs tracking-widest uppercase bg-[#0A1A3A]/50 backdrop-blur-md px-4 py-1.5 md:px-3 md:py-1 rounded-full border border-[rgba(124,143,255,0.08)] max-w-xs mx-auto"
         >
           Tap a light to explore
         </motion.p>
       </div>


      {/* Map area */}
      <div className="absolute inset-0 z-0">
         <WorldMapClean
           prayers={prayers}
           onPrayerTap={handlePrayerTap}
           centerTrigger={centerTrigger}
           prayedId={prayedId}
           newPrayerId={newPrayerId}
           flyTo={flyTo}
         />
      </div>


      {/* Prayer Card Drawer */}
      <Drawer.Root
        open={!!selectedPrayer}
        onOpenChange={(o) => !o && setSelectedPrayer(null)}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[600]" />
          <Drawer.Content
            className="flex flex-col rounded-t-[1.5rem] fixed bottom-0 left-0 right-0 z-[600] max-h-[75vh] focus:outline-none"
            style={{
              background: "linear-gradient(180deg, #111a3a, #0c1230)",
              borderTop: "1px solid rgba(124, 143, 255, 0.1)",
            }}
          >
            <Drawer.Title className="sr-only">Hotspot Details</Drawer.Title>
            <Drawer.Description className="sr-only">
              Prayer activity details for this location
            </Drawer.Description>
            {/* Drag handle — subtle pill indicator */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[rgba(124,143,255,0.2)]" />
            </div>
            <div className="max-w-md w-full mx-auto p-6 pt-2 flex-1 overflow-auto">
              {selectedPrayer && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="w-full flex flex-col items-center"
                >
                  {/* Location */}
                  <p className="text-[#6b7499] text-xs uppercase tracking-[0.2em] mb-4">
                    {selectedPrayer.city}, {selectedPrayer.country}
                  </p>

                  {/* Activity level */}
                  <div
                    className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(255,220,160,0.12), rgba(255,200,120,0.03))",
                      boxShadow: "0 0 40px rgba(255, 210, 140, 0.08)",
                    }}
                  >
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="w-4 h-4 rounded-full"
                      style={{
                        background: "rgb(255, 225, 170)",
                        boxShadow: "0 0 12px rgba(255,220,160,0.6)",
                      }}
                    />
                  </div>

                  <p
                    className="text-[#e2e4f0] text-center font-heading mb-2"
                    style={{ fontSize: "1.15rem", fontWeight: 300 }}
                  >
                    {selectedPrayer.prayerCount} active prayers
                  </p>
                  <p className="text-[#6b7499] text-sm text-center mb-6 max-w-[260px]">
                    People around {selectedPrayer.city} are lifting up prayers right now
                  </p>

                  {/* Sample prayer preview */}
                  <div
                    className="w-full rounded-xl p-4 mb-6"
                    style={{
                      background: "rgba(15, 20, 50, 0.5)",
                      border: "1px solid rgba(124,143,255,0.06)",
                    }}
                  >
                    <p className="text-[#c5cbe2] text-sm mb-2" style={{ lineHeight: 1.6 }}>
                      &ldquo;{selectedPrayer.text}&rdquo;
                    </p>
                    {selectedPrayer.name && (
                      <p className="text-[#4e5573] text-xs">&mdash; {selectedPrayer.name}</p>
                    )}
                  </div>

                  {/* CTA to feed */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      const city = selectedPrayer?.city;
                      const country = selectedPrayer?.country;
                      setSelectedPrayer(null);
                       void navigate(
                         city
                           ? `/feed?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country || "")}`
                           : "/feed"
                       );
                    }}
                    className="flex items-center gap-2.5 px-7 py-3 rounded-full text-sm cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, #7c8fff, #5a6fd6)",
                      color: "#ffffff",
                      boxShadow: "0 4px 24px rgba(124, 143, 255, 0.25)",
                    }}
                  >
                    <Heart size={15} />
                    View Prayers
                    <ArrowRight size={14} />
                  </motion.button>

                  <button
                    onClick={() => setSelectedPrayer(null)}
                    className="mt-3 px-6 py-2 text-xs text-[#5a6080] hover:text-[#8b96c0] transition-colors cursor-pointer"
                  >
                    Back to Map
                  </button>
                </motion.div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}