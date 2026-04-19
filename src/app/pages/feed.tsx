import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Globe, Users, Flame, Share2, MapPin, X, Search } from "lucide-react";
import { Drawer } from "vaul";
import { useSearchParams } from "react-router";
import { mockFeedPrayers, timeAgo } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";
import { FeedCard } from "../components/feed-card";

const TABS = [
  { id: "global", label: "Global", icon: Globe },
] as const;



const categoryColors: Record<string, string> = {
  Health: "#67e8f9",
  Family: "#a78bfa",
  Career: "#fbbf24",
  Guidance: "#7c8fff",
  Peace: "#6ee7b7",
  Other: "#8890b5",
};

export function Feed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const locationCity = searchParams.get("city");
  const locationCountry = searchParams.get("country");
  const hasLocationFilter = !!locationCity;

  const clearLocationFilter = () => {
    setSearchParams({});
  };

  useEffect(() => {
    if (!hasLocationFilter) return;
    const timer = setTimeout(() => {
      setSearchParams({});
    }, 5000);
    return () => clearTimeout(timer);
  }, [hasLocationFilter, setSearchParams]);

  const [tab, setTab] = useState<"global">("global");
   const [prayers, setPrayers] = useState<PrayerRequest[]>(() => {
    try {
      const submitted = JSON.parse(localStorage.getItem("oratio_submitted_prayers") || "[]") as PrayerRequest[];
      if (submitted.length > 0) {
        // Merge submitted prayers at the top, deduplicating by id
        const existingIds = new Set(mockFeedPrayers.map((p: PrayerRequest) => p.id));
        const newOnes = submitted.filter((p: PrayerRequest) => !existingIds.has(p.id));
        return [...newOnes, ...mockFeedPrayers];
      }
    } catch {
      // ignore localStorage errors
    }
    return mockFeedPrayers;
  });
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
  const [detailPrayed, setDetailPrayed] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem("oratio_feed_visited");
  });





  // Add to recent searches

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem("oratio_feed_visited", "true");
  };


  // Build search index from prayers data (locations, people, categories)



  const filteredPrayers = useMemo(() => {
    let result = prayers;

    // Location filter from map hotspot
    if (hasLocationFilter && locationCity) {
      result = result.filter(
        (p) =>
          p.city.toLowerCase() === locationCity.toLowerCase() ||
          (locationCountry && p.country.toLowerCase() === locationCountry.toLowerCase())
      );
    }

    return result;
  }, [prayers, hasLocationFilter, locationCity, locationCountry]);

  // Trending: top 5 by prayer count
  const trending = useMemo(() => {
    return [...prayers].sort((a, b) => b.prayerCount - a.prayerCount).slice(0, 5);
  }, [prayers]);

  const handlePrayed = useCallback((id: string) => {
    setPrayers((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, prayerCount: p.prayerCount + 1 } : p
      )
    );
    // Persist to localStorage for profile tracking
    try {
      const existing = JSON.parse(localStorage.getItem("oratio_prayed") || "[]") as string[];
      if (!existing.includes(id)) {
        localStorage.setItem("oratio_prayed", JSON.stringify([...existing, id]));
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const handleTap = useCallback((prayer: PrayerRequest) => {
    setSelectedPrayer(prayer);
    setDetailPrayed(false);
    setShowConfirmation(false);
  }, []);

  const handleDetailPray = () => {
    if (!selectedPrayer || detailPrayed) return;
    setDetailPrayed(true);
    handlePrayed(selectedPrayer.id);
    setTimeout(() => setShowConfirmation(true), 600);
    // Auto-dismiss after 1.5 seconds (user feedback)
    setTimeout(() => {
      setSelectedPrayer(null);
    }, 2100); // 600ms for animation + 1500ms for display
  };

  const selectedCount = selectedPrayer
    ? prayers.find((p) => p.id === selectedPrayer.id)?.prayerCount ?? selectedPrayer.prayerCount
    : 0;

  const selectedCatColor = categoryColors[selectedPrayer?.category || "Other"] || "#8890b5";

  const handleShare = async (prayer: PrayerRequest) => {
    const shareText = `🙏 Prayer request${prayer.name ? ` from ${prayer.name}` : ""} (${prayer.city}):\n\n"${prayer.text}"\n\n${prayer.prayerCount} people have prayed. Join them on Oratio.`;
    
    if (navigator.share) {
       try {
        await navigator.share({ text: shareText });
      } catch {
        // ignore share cancellation errors
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      // Could add a toast here — for now clipboard is silent
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ background: "#0A1A3A" }}
    >
      {/* Fixed header area */}
      <div
        className="sticky top-0 z-30 pt-[max(1rem,env(safe-area-inset-top))] pb-0 flex-shrink-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(10, 26, 58, 0.98) 70%, rgba(10, 26, 58, 0))",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Title row */}
        <div className="px-5 pt-12 mb-4">
          <h2
            className="text-[#e2e4f0] font-heading tracking-wide"
            style={{ fontSize: "1.35rem", fontWeight: 300 }}
          >
            {hasLocationFilter ? locationCity : "Prayer Feed"}
          </h2>
        </div>


        {/* Tab row */}
        <div className="flex gap-1 px-5 mb-3">
          {TABS.map((t) => {
            const isActive = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs transition-all duration-300 cursor-pointer"
                style={{
                  background: isActive
                    ? "rgba(124,143,255,0.12)"
                    : "transparent",
                  color: isActive ? "#7c8fff" : "#6b7499",
                  border: isActive
                    ? "1px solid rgba(124,143,255,0.2)"
                    : "1px solid transparent",
                }}
              >
                <Icon size={13} strokeWidth={isActive ? 2.2 : 1.8} />
                {t.label}
              </button>
            );
          })}
        </div>

      </div>

      {/* Scrollable content */}
      <div className="flex-1 px-4 pb-28 overflow-y-auto">
        {/* Location filter banner */}
        <AnimatePresence>
          {hasLocationFilter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-4"
            >
              <div
                className="relative rounded-xl px-4 py-3 flex items-center gap-3 bg-primary/8 border border-primary/15"
              >
                <MapPin size={14} className="text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[#c5cbe2] text-sm">
                    Showing prayers from{" "}
                    <span className="text-primary">
                      {locationCity}{locationCountry ? `, ${locationCountry}` : ""}
                    </span>
                  </p>
                </div>
                <button
                  onClick={clearLocationFilter}
                  className="text-[#5a6080] hover:text-[#8890b5] cursor-pointer flex-shrink-0"
                >
                  <X size={14} />
                </button>
                {/* Progress bar */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/30 origin-left"
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: 5, ease: "linear" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Welcome tip — first visit only */}
        <AnimatePresence>
          {showWelcome && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-4"
            >
              <div
                className="rounded-xl px-4 py-3.5 flex items-start gap-3"
                style={{
                  background: "rgba(124, 143, 255, 0.06)",
                  border: "1px solid rgba(124, 143, 255, 0.1)",
                }}
              >
                <span className="text-base mt-0.5 flex-shrink-0">🕊️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[#c5cbe2] text-sm mb-0.5">Welcome to the Prayer Feed</p>
                  <p className="text-[#6b7499] text-xs">
                    Tap any prayer to read the full request and pray for them. Tap the heart to pray right from the list.
                  </p>
                </div>
                <button
                  onClick={dismissWelcome}
                  className="text-[#5a6080] hover:text-[#8890b5] cursor-pointer flex-shrink-0 mt-0.5"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trending section (only on Global tab, no category filter) */}
        {tab === "global" && category === "All" && !searchQuery && !hasLocationFilter && (
          <div className="mb-5">
            <div className="flex items-center gap-1.5 px-1 mb-3">
              <Flame size={13} className="text-[#fbbf24]" />
              <span className="text-[#8890b5] text-[11px] uppercase tracking-[0.15em]">
                Trending Prayers
              </span>
            </div>

            {/* Horizontal scroll of trending cards */}
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {trending.map((prayer, i) => (
                <motion.div
                  key={prayer.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06, duration: 0.35 }}
                  onClick={() => handleTap(prayer)}
                  className="flex-shrink-0 w-[240px] rounded-xl p-3.5 relative overflow-hidden cursor-pointer active:scale-[0.97] transition-transform duration-150"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(25, 32, 65, 0.8), rgba(15, 20, 50, 0.6))",
                    border: "1px solid rgba(124,143,255,0.08)",
                  }}
                >
                  {/* Rank badge */}
                  <div
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-[9px]"
                    style={{
                      background: "rgba(251,191,36,0.12)",
                      color: "#fbbf24",
                      border: "1px solid rgba(251,191,36,0.2)",
                    }}
                  >
                    {i + 1}
                  </div>

                  <div className="flex items-center gap-1.5 mb-2">
                    <MapPin size={11} className="text-[#5a6080]" />
                    <span className="text-[#6b7499] text-[10px]">
                      {prayer.city}
                    </span>
                  </div>
                  <p
                    className="text-[#c5cbe2] mb-2.5 line-clamp-2"
                    style={{ fontSize: "0.8rem", lineHeight: 1.55 }}
                  >
                    &ldquo;{prayer.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-1">
                    <div
                      className="w-1 h-1 rounded-full"
                      style={{
                        background: "#7c8fff",
                        boxShadow: "0 0 4px rgba(124,143,255,0.5)",
                      }}
                    />
                    <span className="text-[#5a6080] text-[10px]">
                      {prayer.prayerCount} prayers
                    </span>
               </div>


             </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Section label */}
        <div className="flex items-center justify-between px-1 mb-3">
          <span className="text-[#6b7499] text-[11px] uppercase tracking-[0.15em]">
            {tab === "nearby"
              ? "From People You Follow"
              : hasLocationFilter
                ? `Prayers from ${locationCity}`
                : "Recent Prayers"}
          </span>
          <span className="text-[#3e4460] text-[10px]">
            {filteredPrayers.length} requests
          </span>
        </div>

        {/* Prayer cards */}
        <div className="space-y-2.5">
          {filteredPrayers.length > 0 ? (
            filteredPrayers.map((prayer, i) => (
              <FeedCard
                key={prayer.id}
                prayer={prayer}
                index={i}
                onPrayed={handlePrayed}
                onTap={handleTap}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div
                className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{
                  background:
                    "radial-gradient(circle, rgba(124,143,255,0.08), transparent)",
                }}
              >
                {tab === "nearby" ? (
                  <Users size={20} className="text-[#4e5573]" />
                ) : hasLocationFilter ? (
                  <MapPin size={20} className="text-[#4e5573]" />
                ) : (
                  <Search size={20} className="text-[#4e5573]" />
                )}
              </div>
              <p className="text-[#6b7499] text-sm mb-1">
                {tab === "nearby"
                  ? "No one followed yet"
                  : hasLocationFilter
                    ? `No ${category !== "All" ? category.toLowerCase() + " " : ""}prayers in ${locationCity}`
                    : "No prayers found"}
              </p>
              <p className="text-[#4e5573] text-xs">
                {tab === "nearby"
                  ? "Follow people from the Global feed to see their prayers here"
                  : hasLocationFilter
                    ? "Try a different category or view all prayers"
                    : "Try a different filter or search"}
              </p>
              {tab === "nearby" ? (
                <button
                  onClick={() => setTab("global")}
                  className="mt-4 px-5 py-2 rounded-full text-xs text-[#7c8fff] bg-[rgba(124,143,255,0.08)] border border-[rgba(124,143,255,0.12)] cursor-pointer hover:bg-[rgba(124,143,255,0.12)] transition-all"
                >
                  Browse Global Feed
                </button>
              ) : hasLocationFilter ? (
                <div className="flex flex-col items-center gap-2 mt-4">
                  {category !== "All" && (
                    <button
                      onClick={() => setCategory("All")}
                      className="px-5 py-2 rounded-full text-xs text-[#7c8fff] bg-[rgba(124,143,255,0.08)] border border-[rgba(124,143,255,0.12)] cursor-pointer hover:bg-[rgba(124,143,255,0.12)] transition-all"
                    >
                      Show all categories
                    </button>
                  )}
                  <button
                    onClick={clearLocationFilter}
                    className="px-5 py-2 rounded-full text-xs text-[#8890b5] bg-[rgba(124,143,255,0.04)] border border-[rgba(124,143,255,0.08)] cursor-pointer hover:bg-[rgba(124,143,255,0.08)] transition-all"
                  >
                    View all prayers
                  </button>
                </div>
              ) : null}
            </motion.div>
          )}
        </div>
      </div>

      {/* Prayer Detail Drawer */}
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
            <Drawer.Title className="sr-only">Prayer Detail</Drawer.Title>
            <Drawer.Description className="sr-only">
              Full prayer request details
            </Drawer.Description>

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[rgba(124,143,255,0.2)]" />
            </div>

            <div className="max-w-md w-full mx-auto p-6 pt-2 flex-1 overflow-auto">
              {selectedPrayer && (
                <AnimatePresence mode="wait">
                  {!showConfirmation ? (
                    <motion.div
                      key="detail"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.35 }}
                      className="w-full flex flex-col items-center"
                    >
                      {/* Location + time */}
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin size={12} className="text-[#5a6080]" />
                        <p className="text-[#6b7499] text-xs uppercase tracking-[0.15em]">
                          {selectedPrayer.city}, {selectedPrayer.country}
                        </p>
                      </div>
                      {selectedPrayer.createdAt && (
                        <p className="text-[#3e4460] text-[11px] mb-5">
                          {timeAgo(selectedPrayer.createdAt)}
                        </p>
                      )}

                      {/* Category badge */}
                      {selectedPrayer.category && (
                        <span
                          className="text-[10px] px-3 py-1 rounded-full uppercase tracking-wider mb-5"
                          style={{
                            color: selectedCatColor,
                            background: `${selectedCatColor}15`,
                            border: `1px solid ${selectedCatColor}20`,
                          }}
                        >
                          {selectedPrayer.category}
                        </span>
                      )}

                      {/* Full prayer text */}
                      <p
                        className="text-[#e2e4f0] text-center font-heading max-w-xs mb-6"
                        style={{ fontSize: "1.1rem", lineHeight: 1.75, fontWeight: 300 }}
                      >
                        &ldquo;{selectedPrayer.text}&rdquo;
                      </p>

                      {/* Name */}
                      {selectedPrayer.name && (
                          <div className="flex items-center gap-2.5 mb-4">
                            <p className="text-[#6b7499] text-sm">
                              &mdash; {selectedPrayer.name}
                            </p>
                          </div>
                      )}

                      {/* Prayer count */}
                      <div className="flex items-center gap-1.5 text-[#6b7499] text-xs mb-8">
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full"
                          style={{
                            background: "#7c8fff",
                            boxShadow: "0 0 6px rgba(124,143,255,0.5)",
                          }}
                        />
                        <span>{selectedCount} people prayed</span>
                      </div>

                      {/* "I Prayed" button */}
                      <motion.button
                        onClick={handleDetailPray}
                        disabled={detailPrayed}
                        whileTap={!detailPrayed ? { scale: 0.96 } : undefined}
                        className="flex items-center gap-2.5 px-8 py-3 rounded-full text-sm transition-all duration-500 cursor-pointer disabled:cursor-default"
                        style={{
                          background: detailPrayed
                            ? "rgba(124, 143, 255, 0.12)"
                            : "linear-gradient(135deg, #7c8fff, #5a6fd6)",
                          color: detailPrayed ? "#7c8fff" : "#ffffff",
                          boxShadow: detailPrayed
                            ? "none"
                            : "0 4px 24px rgba(124, 143, 255, 0.25), 0 0 0 1px rgba(124,143,255,0.1)",
                        }}
                      >
                        <span className="text-base">🙏</span>
                        {detailPrayed ? "Prayed" : "I Prayed"}
                      </motion.button>

                      {/* Share button */}
                      <button
                        onClick={() => { void handleShare(selectedPrayer); }}
                        className="flex items-center gap-1.5 mt-4 px-4 py-1.5 rounded-full text-xs text-[#6b7499] hover:text-[#8b96c0] hover:bg-[rgba(124,143,255,0.06)] transition-all cursor-pointer"
                      >
                        <Share2 size={12} />
                        Share this prayer
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="confirmation"
                      initial={{ scale: 0.92, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="w-full text-center flex flex-col items-center justify-center py-4"
                    >
                      {/* Glow orb */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", damping: 18, stiffness: 150 }}
                        className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(245,243,255,0.15), rgba(124,143,255,0.04))",
                          boxShadow: "0 0 50px rgba(124, 143, 255, 0.12)",
                        }}
                      >
                        <motion.div
                          animate={{ opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 2.5, repeat: Infinity }}
                          className="w-3 h-3 rounded-full"
                          style={{
                            background: "#F5F3FF",
                            boxShadow: "0 0 12px rgba(245,243,255,0.6)",
                          }}
                        />
                      </motion.div>

                      <h2
                        className="text-[#e2e4f0] mb-2 font-heading"
                        style={{ fontSize: "1.25rem", fontWeight: 300 }}
                      >
                        Thank you for praying
                      </h2>
                      <p className="text-[#6b7499] text-sm mb-8">
                        Your prayer has been counted.
                      </p>

                      <button
                        onClick={() => setSelectedPrayer(null)}
                        className="px-6 py-2.5 rounded-full text-sm text-[#8b96c0] bg-[rgba(124,143,255,0.06)] border border-[rgba(124,143,255,0.1)] hover:bg-[rgba(124,143,255,0.12)] transition-all cursor-pointer"
                      >
                        Back to Feed
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}