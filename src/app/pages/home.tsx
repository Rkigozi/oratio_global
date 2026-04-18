import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { WorldMapClean } from "../components/world-map-clean";
import { mockHotspots } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";
import { Search, X, Heart, ArrowRight, MapPin } from "lucide-react";
import { Drawer } from "vaul";

// Build a searchable location index from prayer data
const locationIndex = (() => {
  const map = new Map<string, { lat: number; lng: number }>();
  for (const p of mockHotspots) {
    const key = `${p.city}, ${p.country}`;
    if (!map.has(key)) map.set(key, { lat: p.lat, lng: p.lng });
  }
  return Array.from(map.entries()).map(([name, coords]) => ({
    name,
    ...coords,
  }));
})();

export function Home() {
  
  const navigate = useNavigate();
  const [prayers, setPrayers] = useState(mockHotspots);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(
    null
  );
   const [centerTrigger, setCenterTrigger] = useState(0);
   const [locating, setLocating] = useState(false);
   const [prayedId, setPrayedId] = useState<string | null>(null);
   const [newPrayerId, setNewPrayerId] = useState<string | null>(null);
   const [showCityLabels, setShowCityLabels] = useState(false);

   // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(
    null
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return locationIndex
      .filter((loc) => loc.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery]);

  const handlePrayerTap = useCallback((prayer: PrayerRequest) => {
    setSelectedPrayer(prayer);
  }, []);

  const handleMyLocation = () => {
    setLocating(true);
    setCenterTrigger((prev) => prev + 1);
    setTimeout(() => setLocating(false), 3000);
  };

  const handleSearchSelect = (loc: { name: string; lat: number; lng: number }) => {
    setFlyTo({ lat: loc.lat, lng: loc.lng });
    setSearchQuery("");
    setSearchOpen(false);
  };

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
        <AnimatePresence>
          {!searchOpen && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-[#7a84a8] text-xs tracking-widest uppercase bg-[#0A1A3A]/50 backdrop-blur-md px-4 py-1.5 md:px-3 md:py-1 rounded-full border border-[rgba(124,143,255,0.08)] max-w-xs mx-auto"
            >
              Tap a light to explore
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Search field */}
      <div className="absolute top-16 left-4 right-4 z-[500] flex flex-col items-center">
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-sm"
            >
               <div
                 className="flex items-center gap-2 rounded-xl px-4 py-2.5 border border-border/20 bg-popover/92 backdrop-blur-xl"
               >
                 <Search size={16} className="text-primary flex-shrink-0" />
                 <input
                   type="text"
                   placeholder="Search city or region..."
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   autoFocus
                   className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
                 />
                 <button
                   onClick={() => {
                     setSearchOpen(false);
                     setSearchQuery("");
                   }}
                   className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                 >
                   <X size={16} />
                 </button>
               </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                 <motion.div
                   initial={{ opacity: 0, y: -4 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="mt-2 rounded-xl border border-border overflow-hidden bg-popover/95 backdrop-blur-xl"
                 >
                   {searchResults.map((loc) => (
                     <button
                       key={loc.name}
                       onClick={() => handleSearchSelect(loc)}
                       className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-accent transition-colors cursor-pointer flex items-center gap-3"
                     >
                       <MapPin size={14} className="text-muted-foreground flex-shrink-0" />
                       <span className="truncate">{loc.name}</span>
                     </button>
                   ))}
                 </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
           showCityLabels={showCityLabels}
         />
      </div>

       {/* Floating controls */}
       <div className="absolute bottom-24 right-5 z-[500] flex flex-col gap-3">
          {/* City labels toggle */}
          <button
            onClick={() => setShowCityLabels(!showCityLabels)}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer"
            title={showCityLabels ? "Hide city labels" : "Show city labels"}
            aria-label={showCityLabels ? "Hide city labels" : "Show city labels"}
            style={{
              background: showCityLabels
                ? "rgba(124, 143, 255, 0.15)"
                : "rgba(10, 26, 58, 0.8)",
              border: "1px solid rgba(124, 143, 255, 0.15)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 2px 16px rgba(0,0,0,0.3)",
              color: showCityLabels ? "#7c8fff" : "#8b96c0",
            }}
          >
            <MapPin size={18} />
          </button>
         {/* Search button */}
         <button
           onClick={() => setSearchOpen(!searchOpen)}
           className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer"
           style={{
             background: searchOpen
               ? "rgba(124, 143, 255, 0.15)"
               : "rgba(10, 26, 58, 0.8)",
             border: "1px solid rgba(124, 143, 255, 0.15)",
             backdropFilter: "blur(12px)",
             boxShadow: "0 2px 16px rgba(0,0,0,0.3)",
             color: searchOpen ? "#7c8fff" : "#8b96c0",
           }}
         >
           <Search size={18} />
         </button>
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