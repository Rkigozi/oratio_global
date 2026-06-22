import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, X, Search, ChevronDown, Users } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router";
import { countries } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";
import { FeedCard } from "../components/feed-card";
import { getHashtagCounts } from "../../lib/hashtags";
import { useGeolocation } from "../../lib/use-geolocation";
import { getFeedPrayers, searchUsers, togglePray, getFollowingIds, getFollowerIds, getMyPrayedIds, getMySavedIds } from "../../lib/supabase-queries";
import { LoadingSpinner, ErrorState } from "../components/loading-spinner";
import posthog from "posthog-js";

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
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const searchParamActive = searchParams.get("search") || "";
  const [searchQuery, setSearchQuery] = useState(searchParamActive);
  const [activeSearch, setActiveSearch] = useState(searchParamActive);
  const [showRecent, setShowRecent] = useState(false);
  const [recentVersion, setRecentVersion] = useState(0);
  const [userResults, setUserResults] = useState<Array<{ username: string; display_name: string | null }>>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
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
    if (q) posthog.capture("search_performed", { query: q });
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
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPrayers = useCallback(() => {
    setLoading(true);
    setError(null);
    getFeedPrayers().then((data) => {
      setPrayers(data);
      setLoading(false);
    }).catch(() => {
      setError("Failed to load prayers");
      setLoading(false);
    });
  }, []);

  // Load prayers from Supabase on mount
  useEffect(() => {
    loadPrayers();
  }, [loadPrayers]);
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return !localStorage.getItem("oratio_feed_visited"); } catch { return true; }
  });
  const [prayedIds, setPrayedIds] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const trendingHashtags = useMemo(() => getHashtagCounts(prayers), [prayers]);

  // Load following list, prayed IDs, and saved IDs from Supabase
  useEffect(() => {
    Promise.all([
      getFollowingIds(),
      getFollowerIds(),
    ]).then(([following, followers]) => {
      setFollowingIds(following);
      setFollowerIds(followers);
    });
    getMyPrayedIds().then((ids) => {
      setPrayedIds(ids);
    });
    getMySavedIds().then((ids) => {
      setSavedIds(ids);
    });
  }, []);

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

  // Search users from Supabase when query changes
  useEffect(() => {
    if (!activeSearch) {
      setUserResults([]);
      return;
    }
    setSearchingUsers(true);
    searchUsers(activeSearch).then((results) => {
      setUserResults(results);
      setSearchingUsers(false);
    });
  }, [activeSearch]);

  const dismissWelcome = () => {
    setShowWelcome(false);
    try { localStorage.setItem("oratio_feed_visited", "true"); } catch { /* ignore */ }
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
      result = result.filter((p) => savedIds.includes(p.id));
    }

    // Following filter
    if (showFollowing && followingIds.length > 0) {
      result = result.filter((p) => p.username && followingIds.includes(p.username));
    }

    // Followers filter
    if (showFollowers && followerIds.length > 0) {
      result = result.filter((p) => p.username && followerIds.includes(p.username));
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
  }, [prayers, locationCity, locationCountry, showSaved, showFollowing, showFollowers, followingIds, followerIds, activeSearch]);

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
        return prayersPrev.map((p) =>
          p.id === id ? { ...p, prayerCount: p.prayerCount + (newPrayed ? 1 : -1) } : p
        );
      });

      // Sync to Supabase
      void togglePray(id, newPrayed);

      // Return updated prayed IDs
      if (newPrayed && !prev.includes(id)) {
        return [...prev, id];
      } else if (!newPrayed && prev.includes(id)) {
        return prev.filter(pId => pId !== id);
      }
      return prev;
    });
  }, []);

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
      style={{ background: "rgb(var(--rgb-bg))" }}
    >
      {/* Fixed header area */}
      <div
        className="sticky top-0 z-20 pb-0 flex-shrink-0"
        style={{
          paddingTop: "calc(3.5rem + env(safe-area-inset-top))",
          background:
            "linear-gradient(to bottom, rgba(var(--rgb-bg), 0.98) 70%, rgba(var(--rgb-bg), 0))",
        }}
      >
        {/* Filter pills row */}
        <div className="px-5 mb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
          {/* All */}
          <button
            onClick={() => { setSearchParams({}); setShowSaved(false); }}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-all duration-300 cursor-pointer"
            style={{
              background: !hasLocationFilter && !showSaved ? "rgba(var(--rgb-accent), 0.12)" : "rgba(var(--rgb-accent), 0.04)",
              border: !hasLocationFilter && !showSaved ? "1px solid rgba(var(--rgb-accent), 0.2)" : "1px solid rgba(var(--rgb-accent), 0.06)",
              color: !hasLocationFilter && !showSaved ? "rgb(var(--rgb-accent))" : "rgb(var(--rgb-text-muted))",
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
                background: hasLocationFilter ? "rgba(var(--rgb-accent), 0.12)" : "rgba(var(--rgb-accent), 0.04)",
                border: hasLocationFilter ? "1px solid rgba(var(--rgb-accent), 0.2)" : "1px solid rgba(var(--rgb-accent), 0.06)",
                color: hasLocationFilter ? "rgb(var(--rgb-accent))" : "rgb(var(--rgb-text-muted))",
              }}
            >
              <MapPin size={11} />
              Near Me
            </button>
          )}

          {/* Following */}
          <button
            onClick={() => setShowFollowing(!showFollowing)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-all duration-300 cursor-pointer"
            style={{
              background: showFollowing ? "rgba(var(--rgb-accent), 0.12)" : "rgba(var(--rgb-accent), 0.04)",
              border: showFollowing ? "1px solid rgba(var(--rgb-accent), 0.2)" : "1px solid rgba(var(--rgb-accent), 0.06)",
              color: showFollowing ? "rgb(var(--rgb-accent))" : "rgb(var(--rgb-text-muted))",
              opacity: followingIds.length === 0 ? 0.5 : 1,
            }}
          >
            Following
          </button>

          {/* Followers */}
          <button
            onClick={() => setShowFollowers(!showFollowers)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-all duration-300 cursor-pointer"
            style={{
              background: showFollowers ? "rgba(var(--rgb-accent), 0.12)" : "rgba(var(--rgb-accent), 0.04)",
              border: showFollowers ? "1px solid rgba(var(--rgb-accent), 0.2)" : "1px solid rgba(var(--rgb-accent), 0.06)",
              color: showFollowers ? "rgb(var(--rgb-accent))" : "rgb(var(--rgb-text-muted))",
              opacity: followerIds.length === 0 ? 0.5 : 1,
            }}
          >
            Followers
          </button>

          {/* Saved */}
          <button
            onClick={() => setShowSaved(!showSaved)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-all duration-300 cursor-pointer"
            style={{
              background: showSaved ? "rgba(var(--rgb-accent), 0.12)" : "rgba(var(--rgb-accent), 0.04)",
              border: showSaved ? "1px solid rgba(var(--rgb-accent), 0.2)" : "1px solid rgba(var(--rgb-accent), 0.06)",
              color: showSaved ? "rgb(var(--rgb-accent))" : "rgb(var(--rgb-text-muted))",
            }}
          >
            Saved
          </button>

          {/* Country — opens filter */}
          <button
            onClick={() => setShowCountryFilter(!showCountryFilter)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-all duration-300 cursor-pointer flex items-center gap-1"
            style={{
              background: hasLocationFilter ? "rgba(var(--rgb-accent), 0.12)" : "rgba(var(--rgb-accent), 0.04)",
              border: hasLocationFilter ? "1px solid rgba(var(--rgb-accent), 0.2)" : "1px solid rgba(var(--rgb-accent), 0.06)",
              color: hasLocationFilter ? "rgb(var(--rgb-accent))" : "rgb(var(--rgb-text-muted))",
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
                className="absolute top-0 left-5 w-44 max-h-60 overflow-y-auto rounded-xl border border-accent/15 z-20"
                style={{
                  background: "rgba(var(--rgb-surface), 0.98)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <button
                  onClick={() => { setSearchParams({}); setShowCountryFilter(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-accent/10 transition-colors cursor-pointer truncate"
                >
                  All Countries
                </button>
                {countries.map((country) => (
                  <button
                    key={country}
                    onClick={() => { setSearchParams({ country }); setShowCountryFilter(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-accent/10 transition-colors cursor-pointer truncate"
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
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
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
              className="w-full rounded-xl pl-9 pr-8 py-2.5 text-text placeholder-text-dim text-xs focus:outline-none border border-accent/10 focus:border-accent/30 transition-colors"
              style={{ background: "rgba(var(--rgb-surface), 0.6)" }}
            />
              {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setActiveSearch(""); setSearchParams({}); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors cursor-pointer"
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
                className="absolute top-full left-5 right-5 mt-1 rounded-xl border border-accent/10 overflow-hidden z-20"
                style={{
                  background: "rgba(var(--rgb-surface), 0.98)",
                  backdropFilter: "blur(16px)",
                }}
              >
                <div className="px-3 py-2 text-text-dim text-[10px] uppercase tracking-wider">
                  Recent searches
                </div>
                {recentSearches.map((q) => (
                  <div
                    key={q}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-accent/6 transition-colors group"
                  >
                    <button
                      onClick={() => handleRecentClick(q)}
                      className="flex-1 min-w-0 text-left text-text-secondary text-xs truncate cursor-pointer"
                    >
                      {q}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeRecentSearch(q); }}
                      className="text-text-faint hover:text-text-muted transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
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
              <span className="text-text-dim text-[9px] uppercase tracking-wider">Trending</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {trendingHashtags.slice(0, 8).map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag.replace("#", ""))}
                  className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] transition-all cursor-pointer"
                  style={{
                    background: "rgba(var(--rgb-accent), 0.06)",
                    border: "1px solid rgba(var(--rgb-accent), 0.1)",
                    color: "rgb(var(--rgb-accent))",
                  }}
                >
                  {tag} <span className="text-text-dim">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Scrollable content */}
      <div className="flex-1 px-4 overflow-y-auto pb-28">
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
                style={{ background: "rgba(var(--rgb-accent), 0.06)", border: "1px solid rgba(var(--rgb-accent), 0.1)" }}
              >
                <MapPin size={14} className="text-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-text-secondary text-sm">
                    Showing prayers from{" "}
                    <span style={{ color: "rgb(var(--rgb-accent))" }}>
                       {locationCity ? `${locationCity}${locationCountry ? `, ${locationCountry}` : ''}` : locationCountry}
                    </span>
                  </p>
                </div>
                <button
                  onClick={clearLocationFilter}
                  className="text-text-dim hover:text-text-muted cursor-pointer flex-shrink-0"
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
                style={{ background: "rgba(var(--rgb-accent), 0.06)", border: "1px solid rgba(var(--rgb-accent), 0.1)" }}
              >
                <Search size={14} className="text-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-text-secondary text-sm">
                    Searching for "<span style={{ color: "rgb(var(--rgb-accent))" }}>{activeSearch}</span>"
                  </p>
                </div>
                <button
                  onClick={() => { setSearchQuery(""); setActiveSearch(""); }}
                  className="text-text-dim hover:text-text-muted cursor-pointer flex-shrink-0"
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
                  background: "rgba(var(--rgb-accent), 0.06)",
                  border: "1px solid rgba(var(--rgb-accent), 0.1)",
                }}
              >
                <span className="text-base mt-0.5 flex-shrink-0">🕊️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-text-secondary text-sm mb-0.5">Welcome to the Prayer Feed</p>
                  <p className="text-text-muted text-xs">
                    People around the world are sharing prayer needs and praying for each other. Tap any prayer to read it and pray. Tap 🙏 to pray right from the list.
                  </p>
                </div>
                <button
                  onClick={dismissWelcome}
                  className="text-text-dim hover:text-text-muted cursor-pointer flex-shrink-0 mt-0.5"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtle CTA */}
        {!showSaved && !activeSearch && !hasLocationFilter && (
          <p className="text-text-dim text-xs text-center mb-4">
            Tap any prayer to pray for someone today
          </p>
        )}

        {/* Section label */}
        <div className="flex items-center justify-between px-1 mb-3">
          <span className="text-text-muted text-[11px] uppercase tracking-[0.15em]">
              {showSaved ? "Saved Prayers" : hasLocationFilter ? `Prayers from ${locationCity || locationCountry}` : "Latest Prayer Needs"}
          </span>
          <span className="text-text-faint text-[10px]">
            {filteredPrayers.length} requests
          </span>
        </div>

        {/* User search results */}
        {activeSearch && filteredPrayers.length === 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 px-1 mb-3">
              <Users size={12} className="text-text-dim" />
              <span className="text-text-muted text-[10px] uppercase tracking-[0.15em]">Users</span>
            </div>
            <div className="space-y-1.5">
              {searchingUsers ? (
                <p className="text-text-dim text-xs px-1">Searching...</p>
              ) : userResults.length > 0 ? (
                userResults.map((u) => (
                  <div
                    key={u.username}
                    onClick={() => void navigate(`/user/${encodeURIComponent(u.username)}`)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-accent/4 transition-colors"
                  >
                    <img
                      src={`https://ui-avatars.com/api/?name=${u.username[0].toUpperCase()}&background=7c8fff&color=fff&size=32&font-size=0.5`}
                      alt={u.username || "User"}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-text-secondary text-sm">@{u.username}</p>
                      {u.display_name && (
                        <p className="text-text-dim text-[10px]">{u.display_name}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-text-dim text-xs px-1">No users found</p>
              )}
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && <LoadingSpinner text="Loading prayers..." />}

        {/* Error state */}
        {error && <ErrorState message={error} onRetry={loadPrayers} />}

        {/* Prayer cards */}
        {!loading && !error && (
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
                     onUserClick={(u) => void navigate(`/user/${encodeURIComponent(u)}`)}
                   />
              ))}
              {visibleCount < filteredPrayers.length ? (
                <div ref={sentinelRef} className="h-4" />
              ) : (
                <p className="text-center text-text-faint text-[10px] pt-2 pb-1">
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
                    "radial-gradient(circle, rgba(var(--rgb-accent), 0.08), transparent)",
                }}
              >
                  {showSaved ? (
                    <span className="text-xl text-text-dim">📖</span>
                  ) : hasLocationFilter ? (
                    <MapPin size={20} className="text-text-dim" />
                  ) : (
                    <Search size={20} className="text-text-dim" />
                  )}
              </div>
              <p className="text-text-muted text-sm mb-1">
                   {showSaved
                      ? "No saved prayers yet"
                      : hasLocationFilter
                      ? `No prayers in ${locationCity || locationCountry}`
                      : "No prayers found"}
              </p>
              <p className="text-text-dim text-xs">
                  {showSaved ? "Tap ⋯ on a prayer and choose Save, or save from the prayer detail page" : "View all prayers"}
              </p>
               {hasLocationFilter ? (
                 <div className="flex flex-col items-center gap-2 mt-4">
                   <button
                     onClick={clearLocationFilter}
                     className="px-5 py-2 rounded-full text-xs text-text-muted bg-accent/4 border border-accent/8 cursor-pointer hover:bg-accent/8 transition-all"
                   >
                     View all prayers
                   </button>
                 </div>
               ) : null}
            </motion.div>
          )}
        </div>
        )}
      </div>

    </div>
  );
}