import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, X, Search, ChevronDown } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router";
import { mockFeedPrayers, countries } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";
import { getPrayedIds } from "../data/profile-data";
import { FeedCard } from "../components/feed-card";
import { getHashtagCounts } from "../../lib/hashtags";
import { useGeolocation } from "../../lib/use-geolocation";






export function Feed() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { location: geoLocation } = useGeolocation();
  const locationCity = searchParams.get("city");
  const locationCountry = searchParams.get("country");
  const hasLocationFilter = !!locationCity || !!locationCountry;

  const clearLocationFilter = () => {
    setSearchParams({});
  };

  const [showSaved, setShowSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [showRecent, setShowRecent] = useState(false);
  const [recentVersion, setRecentVersion] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);

  const recentSearches = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("oratio_recent_searches") || "[]") as string[];
    } catch { return []; }
  }, [recentVersion]);

  const addRecentSearch = (q: string) => {
    if (!q.trim()) return;
    try {
      const existing = JSON.parse(localStorage.getItem("oratio_recent_searches") || "[]") as string[];
      const filtered = existing.filter((s) => s !== q);
      filtered.unshift(q);
      localStorage.setItem("oratio_recent_searches", JSON.stringify(filtered.slice(0, 10)));
      setRecentVersion((v) => v + 1);
    } catch { /* ignore */ }
  };

  const removeRecentSearch = (q: string) => {
    try {
      const existing = JSON.parse(localStorage.getItem("oratio_recent_searches") || "[]") as string[];
      localStorage.setItem("oratio_recent_searches", JSON.stringify(existing.filter((s) => s !== q)));
      setRecentVersion((v) => v + 1);
    } catch { /* ignore */ }
  };

  const handleSearchSubmit = () => {
    const q = searchQuery.trim();
    setActiveSearch(q);
    addRecentSearch(q);
    setShowRecent(false);
  };

  const handleRecentClick = (q: string) => {
    setSearchQuery(q);
    setActiveSearch(q);
    setShowRecent(false);
  };

  // Close recent dropdown on outside click
  useEffect(() => {
    if (!showRecent) return;
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowRecent(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showRecent]);

  const [showCountryFilter, setShowCountryFilter] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem("oratio_feed_visited");
  });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  const [prayedIds, setPrayedIds] = useState<string[]>(() => getPrayedIds());
  const [visibleCount, setVisibleCount] = useState(20);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const trendingHashtags = useMemo(() => getHashtagCounts(prayers), [prayers]);

  // Listen for prayer addition/deletion via custom events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAdd = (e: Event) => {
      const prayer = (e as CustomEvent).detail as PrayerRequest;
      setPrayers((prev) => {
        if (prev.some(p => p.id === prayer.id)) return prev;
        return [prayer, ...prev];
      });
      setVisibleCount(20);
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

  // Close country filter dropdown when location changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowCountryFilter(false);
  }, [locationCity, locationCountry]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryFilter(false);
      }
    };
    if (showCountryFilter) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCountryFilter]);

  // Add to recent searches

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem("oratio_feed_visited", "true");
  };


  // Build search index from prayers data (locations, people, categories)



  const filteredPrayers = useMemo(() => {
    let result = prayers;

    // Location filter from map hotspot or country filter
    if (locationCity) {
      // City filter (with optional country fallback)
      result = result.filter(
        (p) =>
          p.city.toLowerCase() === locationCity.toLowerCase() ||
          (locationCountry && p.country.toLowerCase() === locationCountry.toLowerCase())
      );
    } else if (locationCountry) {
      // Country-only filter
      result = result.filter(
        (p) => p.country.toLowerCase() === locationCountry.toLowerCase()
      );
    }

    // Saved filter
    if (showSaved) {
      let savedIds: string[] = [];
      try { savedIds = JSON.parse(localStorage.getItem("oratio_saved") || "[]") as string[]; }
      catch { savedIds = []; }
      result = result.filter((p) => savedIds.includes(p.id));
    }

    // Search filter
    if (activeSearch) {
      const q = activeSearch.toLowerCase();
      result = result.filter((p) =>
        p.text.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [prayers, locationCity, locationCountry, showSaved, activeSearch]);

  // Only render visible batch for infinite scroll
  const visiblePrayers = useMemo(() => {
    return filteredPrayers.slice(0, visibleCount);
  }, [filteredPrayers, visibleCount]);

  // Infinite scroll - load more when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 20, filteredPrayers.length));
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredPrayers.length]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [locationCity, locationCountry, showSaved]);

  const togglePrayed = useCallback((id: string) => {

    setPrayedIds((prev) => {
      const isCurrentlyPrayed = prev.includes(id);
      const newPrayed = !isCurrentlyPrayed;

      
      // Update prayer count in state
      setPrayers((prayersPrev) => {

        const updated = prayersPrev.map((p) =>
          p.id === id ? { ...p, prayerCount: p.prayerCount + (newPrayed ? 1 : -1) } : p
        );

        return updated;
      });
      
      // Persist to localStorage for profile tracking
      try {
        const existing = JSON.parse(localStorage.getItem("oratio_prayed") || "[]") as string[];

        if (newPrayed && !existing.includes(id)) {
          localStorage.setItem("oratio_prayed", JSON.stringify([...existing, id]));

        } else if (!newPrayed && existing.includes(id)) {
          localStorage.setItem("oratio_prayed", JSON.stringify(existing.filter(pId => pId !== id)));

        }
      } catch (e) {
        console.error('localStorage error:', e);
      }

      // Update count in submitted prayers storage
      try {
        const submittedPrayers = JSON.parse(localStorage.getItem("oratio_submitted_prayers") || "[]") as PrayerRequest[];

        const updated = submittedPrayers.map(p => 
          p.id === id ? { ...p, prayerCount: p.prayerCount + (newPrayed ? 1 : -1) } : p
        );
        localStorage.setItem("oratio_submitted_prayers", JSON.stringify(updated));

      } catch (e) {
        console.error('localStorage submitted error:', e);
      }
      
      // Return updated prayed IDs
      if (newPrayed && !prev.includes(id)) {
        const newIds = [...prev, id];

        return newIds;
      } else if (!newPrayed && prev.includes(id)) {
        const newIds = prev.filter(pId => pId !== id);

        return newIds;
      }

      return prev;
    });
  }, []); // No dependencies needed because using functional updates

  const handleTap = (prayer: PrayerRequest) => {
    void navigate(`/prayer/${prayer.id}`);
  };

  const handleTagClick = (tag: string) => {
    const q = tag.startsWith("#") ? tag : `#${tag}`;
    setSearchQuery(q);
    setActiveSearch(q);
    addRecentSearch(q);
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
            Prayer Feed
          </h2>
        </div>

        {/* Filter pills row */}
        <div className="px-5 mb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
          {/* All */}
          <button
            onClick={() => { setSearchParams({}); setShowSaved(false); }}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-all duration-300 cursor-pointer"
            style={{
              background: !hasLocationFilter && !showSaved ? "rgba(124,143,255,0.12)" : "rgba(124,143,255,0.04)",
              border: !hasLocationFilter && !showSaved ? "1px solid rgba(124,143,255,0.2)" : "1px solid rgba(124,143,255,0.06)",
              color: !hasLocationFilter && !showSaved ? "#7c8fff" : "#6b7499",
            }}
          >
            All
          </button>

          {/* Near Me */}
          {geoLocation && (
            <button
              onClick={() => {
                const city = geoLocation.city;
                const country = geoLocation.country;
                if (hasLocationFilter) {
                  setSearchParams({});
                } else if (city && city !== "Unknown") {
                  setSearchParams({ city, country });
                } else if (country && country !== "Unknown") {
                  setSearchParams({ country });
                }
              }}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-all duration-300 cursor-pointer flex items-center gap-1"
              style={{
                background: hasLocationFilter ? "rgba(124,143,255,0.12)" : "rgba(124,143,255,0.04)",
                border: hasLocationFilter ? "1px solid rgba(124,143,255,0.2)" : "1px solid rgba(124,143,255,0.06)",
                color: hasLocationFilter ? "#7c8fff" : "#6b7499",
              }}
            >
              <MapPin size={11} />
              Near Me
            </button>
          )}

          {/* Saved */}
          <button
            onClick={() => setShowSaved(!showSaved)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-all duration-300 cursor-pointer"
            style={{
              background: showSaved ? "rgba(124,143,255,0.12)" : "rgba(124,143,255,0.04)",
              border: showSaved ? "1px solid rgba(124,143,255,0.2)" : "1px solid rgba(124,143,255,0.06)",
              color: showSaved ? "#7c8fff" : "#6b7499",
            }}
          >
            Saved
          </button>

          {/* Country — opens filter */}
          <button
            onClick={() => setShowCountryFilter(!showCountryFilter)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-all duration-300 cursor-pointer flex items-center gap-1"
            style={{
              background: hasLocationFilter ? "rgba(124,143,255,0.12)" : "rgba(124,143,255,0.04)",
              border: hasLocationFilter ? "1px solid rgba(124,143,255,0.2)" : "1px solid rgba(124,143,255,0.06)",
              color: hasLocationFilter ? "#7c8fff" : "#6b7499",
            }}
          >
            <span>{locationCountry || "Country"}</span>
            <ChevronDown size={12} />
          </button>
        </div>

        {/* Country dropdown — rendered outside overflow container */}
        <div className="relative px-5" ref={dropdownRef}>
          <AnimatePresence>
            {showCountryFilter && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-0 left-5 w-44 max-h-60 overflow-y-auto rounded-xl border border-[rgba(124,143,255,0.15)] z-20"
                style={{
                  background: "rgba(15, 20, 55, 0.98)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <button
                  onClick={() => { setSearchParams({}); setShowCountryFilter(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#c5cdff] hover:bg-[rgba(124,143,255,0.1)] transition-colors cursor-pointer truncate"
                >
                  All Countries
                </button>
                {countries.map((country) => (
                  <button
                    key={country}
                    onClick={() => { setSearchParams({ country }); setShowCountryFilter(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-[#c5cdff] hover:bg-[rgba(124,143,255,0.1)] transition-colors cursor-pointer truncate"
                  >
                    {country}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* Search bar */}
        <div className="px-5 mb-3 relative" ref={searchRef}>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4e5573] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowRecent(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearchSubmit();
                if (e.key === "Escape") { setShowRecent(false); (e.target as HTMLInputElement).blur(); }
              }}
              placeholder="Search prayers..."
              className="w-full rounded-xl pl-9 pr-8 py-2.5 text-[#e2e4f0] placeholder-[#4e5573] text-xs focus:outline-none border border-[rgba(124,143,255,0.1)] focus:border-[rgba(124,143,255,0.3)] transition-colors"
              style={{ background: "rgba(15, 20, 50, 0.6)" }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setActiveSearch(""); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4e5573] hover:text-[#6b7499] transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Recent searches dropdown */}
          <AnimatePresence>
            {showRecent && recentSearches.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-5 right-5 mt-1 rounded-xl border border-[rgba(124,143,255,0.1)] overflow-hidden z-20"
                style={{
                  background: "rgba(12, 20, 48, 0.98)",
                  backdropFilter: "blur(16px)",
                }}
              >
                <div className="px-3 py-2 text-[#4e5573] text-[10px] uppercase tracking-wider">
                  Recent searches
                </div>
                {recentSearches.map((q) => (
                  <div
                    key={q}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-[rgba(124,143,255,0.06)] transition-colors group"
                  >
                    <button
                      onClick={() => handleRecentClick(q)}
                      className="flex-1 text-left text-[#c5cdff] text-xs truncate cursor-pointer"
                    >
                      {q}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeRecentSearch(q); }}
                      className="text-[#3e4460] hover:text-[#6b7499] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Trending hashtags */}
        {!searchQuery && !showSaved && trendingHashtags.length > 0 && (
          <div className="px-5 mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[#4e5573] text-[9px] uppercase tracking-wider">Trending</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {trendingHashtags.slice(0, 8).map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag.replace("#", ""))}
                  className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] transition-all cursor-pointer"
                  style={{
                    background: "rgba(124,143,255,0.06)",
                    border: "1px solid rgba(124,143,255,0.1)",
                    color: "#7c8fff",
                  }}
                >
                  {tag} <span className="text-[#4e5573]">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Scrollable content */}
      <div className="flex-1 px-4 overflow-y-auto">
        {/* Filter banners */}
        <AnimatePresence>
          {hasLocationFilter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-2"
            >
              <div
                className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: "rgba(124,143,255,0.06)", border: "1px solid rgba(124,143,255,0.1)" }}
              >
                <MapPin size={14} className="text-[#7c8fff] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[#c5cbe2] text-sm">
                    Showing prayers from{" "}
                    <span style={{ color: "#7c8fff" }}>
                       {locationCity ? `${locationCity}${locationCountry ? `, ${locationCountry}` : ''}` : locationCountry}
                    </span>
                  </p>
                </div>
                <button
                  onClick={clearLocationFilter}
                  className="text-[#5a6080] hover:text-[#8890b5] cursor-pointer flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
          {activeSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-2"
            >
              <div
                className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: "rgba(124,143,255,0.06)", border: "1px solid rgba(124,143,255,0.1)" }}
              >
                <Search size={14} className="text-[#7c8fff] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[#c5cbe2] text-sm">
                    Searching for "<span style={{ color: "#7c8fff" }}>{activeSearch}</span>"
                  </p>
                </div>
                <button
                  onClick={() => { setSearchQuery(""); setActiveSearch(""); }}
                  className="text-[#5a6080] hover:text-[#8890b5] cursor-pointer flex-shrink-0"
                >
                  <X size={14} />
                </button>
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
                    People around the world are sharing prayer needs and praying for each other. Tap any prayer to read it and pray. Tap 🙏 to pray right from the list.
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

        {/* Subtle CTA */}
        {!showSaved && !activeSearch && !hasLocationFilter && (
          <p className="text-[#5a6080] text-xs text-center mb-4">
            Tap any prayer to pray for someone today
          </p>
        )}

        {/* Section label */}
        <div className="flex items-center justify-between px-1 mb-3">
          <span className="text-[#6b7499] text-[11px] uppercase tracking-[0.15em]">
              {showSaved ? "Saved Prayers" : hasLocationFilter ? `Prayers from ${locationCity || locationCountry}` : "Latest Prayer Needs"}
          </span>
          <span className="text-[#3e4460] text-[10px]">
            {filteredPrayers.length} requests
          </span>
        </div>

        {/* Prayer cards */}
        <div className="space-y-2.5">
          {filteredPrayers.length > 0 ? (
            <>
              {visiblePrayers.map((prayer, i) => (
                 <FeedCard
                    key={prayer.id}
                    prayer={prayer}
                    index={i}
                    hasPrayed={prayedIds.includes(prayer.id)}
                    onPrayed={togglePrayed}
                    onTap={handleTap}
                    onTagClick={handleTagClick}
                  />
              ))}
              {visibleCount < filteredPrayers.length ? (
                <div ref={sentinelRef} className="h-4" />
              ) : (
                <p className="text-center text-[#3e4460] text-[10px] pt-2 pb-1">
                  All {filteredPrayers.length} prayers loaded
                </p>
              )}
            </>
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
                  {showSaved ? (
                    <span className="text-xl text-[#4e5573]">📖</span>
                  ) : hasLocationFilter ? (
                    <MapPin size={20} className="text-[#4e5573]" />
                  ) : (
                    <Search size={20} className="text-[#4e5573]" />
                  )}
              </div>
              <p className="text-[#6b7499] text-sm mb-1">
                   {showSaved
                      ? "No saved prayers yet"
                      : hasLocationFilter
                      ? `No prayers in ${locationCity || locationCountry}`
                      : "No prayers found"}
              </p>
              <p className="text-[#4e5573] text-xs">
                  {showSaved ? "Tap ⋯ on a prayer and choose Save, or save from the prayer detail page" : "View all prayers"}
              </p>
               {hasLocationFilter ? (
                 <div className="flex flex-col items-center gap-2 mt-4">
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

    </div>
  );
}