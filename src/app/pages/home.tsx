import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { WorldMapClean } from "../components/world-map-clean";
import { mockHotspots } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";
import { Heart, ArrowRight, MapPin, Locate } from "lucide-react";
import { Drawer } from "vaul";
import { getStoredSubmittedPrayers } from "../data/profile-data";
import { useGeolocation } from "../../lib/use-geolocation";


export function Home() {
  
  const navigate = useNavigate();
  const { location: geoLocation, loading: geoLoading, denied: geoDenied, requestLocation } = useGeolocation();
   const [prayers, setPrayers] = useState(() => {
     const submitted = getStoredSubmittedPrayers();
     const combined = [...submitted, ...mockHotspots];
     const unique = combined.filter((p, index, self) => 
       index === self.findIndex((p2) => p2.id === p.id)
     );
     return unique;
   });
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
   const [newPrayerId, setNewPrayerId] = useState<string | null>(null);
   const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
   const [showGeoPrompt, setShowGeoPrompt] = useState(true);
  const [hintDone] = useState(() => {
    try { return !!localStorage.getItem("oratio_hint_shown"); } catch { return false; }
  });

  // Fly to user location when it's resolved
  useEffect(() => {
    if (geoLocation) {
      setFlyTo({ lat: geoLocation.lat, lng: geoLocation.lng });
    }
  }, [geoLocation]);

  const handlePrayerTap = useCallback((prayer: PrayerRequest) => {
    setSelectedPrayer(prayer);
   }, []);



   // Update selectedPrayer when prayers change
   useEffect(() => {
     if (selectedPrayer) {
       const updated = prayers.find(p => p.id === selectedPrayer.id);
        if (updated && updated !== selectedPrayer) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSelectedPrayer(updated);
        }
     }
   }, [prayers, selectedPrayer]);

   // Listen for new prayer submissions (via custom event from Submit page)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAdd = (e: Event) => {
      const prayer = (e as CustomEvent).detail as PrayerRequest;
      setPrayers((prev) => [prayer, ...prev]);
      setNewPrayerId(prayer.id);
      setFlyTo({ lat: prayer.lat, lng: prayer.lng });
      setTimeout(() => setNewPrayerId(null), 2000);
    };

    const handleRemove = (e: Event) => {
      const prayerId = (e as CustomEvent).detail as string;
      setPrayers((prev) => prev.filter(p => p.id !== prayerId));
    };

    window.addEventListener("oratio-prayer-added", handleAdd);
    window.addEventListener("oratio-prayer-removed", handleRemove);

    return () => {
      window.removeEventListener("oratio-prayer-added", handleAdd);
      window.removeEventListener("oratio-prayer-removed", handleRemove);
    };
  }, []);

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: "#0A1A3A" }}
    >
       {/* Header hint — shows once */}
       {!hintDone && (
         <motion.div
           initial={{ opacity: 1 }}
           animate={{ opacity: 1 }}
           className="absolute top-16 left-0 right-0 z-[500] text-center pointer-events-none flex flex-col items-center"
         >
           <motion.p
             initial={{ opacity: 0, y: -10 }}
             animate={{ opacity: [1, 1, 0] }}
             transition={{ duration: 0.6, times: [0, 0.5, 1] }}
             onAnimationComplete={() => {
               try { localStorage.setItem("oratio_hint_shown", "1"); } catch {}
             }}
             className="text-[#e8eaf6] text-xs tracking-widest uppercase px-4 py-1.5 rounded-full max-w-xs mx-auto"
             style={{
               background: "rgba(10, 26, 58, 0.85)",
               border: "1px solid rgba(124, 143, 255, 0.15)",
             }}
           >
             Tap a location to pray
           </motion.p>
         </motion.div>
       )}


      {/* Map area */}
      <div className="absolute inset-0 z-0">
         <WorldMapClean
            prayers={prayers}
            onPrayerTap={handlePrayerTap}
            newPrayerId={newPrayerId}
            flyTo={flyTo}
          />
      </div>

      {/* Back to my location button */}
      {geoLocation && (
        <button
          onClick={() => setFlyTo({ lat: geoLocation.lat, lng: geoLocation.lng })}
          className="absolute bottom-16 right-4 z-[500] w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
          style={{
            background: "rgba(10, 26, 58, 0.8)",
            border: "1px solid rgba(124, 143, 255, 0.12)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Locate size={15} className="text-[#7c8fff]" />
        </button>
      )}

      {/* Geolocation prompt */}
      <AnimatePresence>
        {showGeoPrompt && !geoLocation && !geoDenied && !geoLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 right-4 z-[500] max-w-sm mx-auto"
          >
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{
                background: "rgba(10, 26, 58, 0.92)",
                border: "1px solid rgba(124, 143, 255, 0.12)",
                backdropFilter: "blur(12px)",
              }}
            >
              <MapPin size={16} className="text-[#7c8fff] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[#e2e4f0] text-sm font-medium mb-0.5">See prayers near you?</p>
                <p className="text-[#6b7499] text-xs">Find prayers from your area</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowGeoPrompt(false)}
                  className="text-[#4e5573] hover:text-[#6b7499] text-xs transition-colors cursor-pointer"
                >
                  Not now
                </button>
                <button
                  onClick={() => { void requestLocation(); }}
                  className="px-3 py-1.5 rounded-full text-xs text-white cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #7c8fff, #5a6fd6)",
                  }}
                >
                  Allow
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    {selectedPrayer.prayerCount} people praying in {selectedPrayer.city}
                  </p>
                  <p className="text-[#6b7499] text-sm text-center mb-6 max-w-[260px]">
                    People around {selectedPrayer.city} are lifting up prayers right now
                  </p>



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