import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Globe, Users, Flame, Search, X, Share2, MapPin, UserPlus, UserCheck, User, Tag, Clock } from "lucide-react";
import { Drawer } from "vaul";
import { useSearchParams } from "react-router";
import { mockFeedPrayers, timeAgo } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";
import { FeedCard } from "../components/feed-card";

const TABS = [
  { id: "global", label: "Global", icon: Globe },
  { id: "nearby", label: "Community", icon: Users },
] as const;

const CATEGORIES = ["All", "Health", "Family", "Career", "Guidance", "Peace", "Other"];

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

  const [tab, setTab] = useState<"global" | "nearby">("global");
  const [category, setCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState<'all' | 'people' | 'locations' | 'categories'>('all');
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
   const [following, setFollowing] = useState<Set<string>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("oratio_following") || "[]") as string[];
      return new Set(saved);
    } catch {
      return new Set();
    }
  });

  // Search suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Recent searches
  const [recentSearches, setRecentSearches] = useState<Array<{type: 'location' | 'person' | 'category', name: string}>>(() => {
    try {
      const saved = localStorage.getItem('oratio_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Avatar picker for people
  const getAvatarForName = (name: string) => {
    const avatars = ["🙏", "✝️", "🕊️", "💛", "🌿", "⭐", "🔥", "💜"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return avatars[hash % avatars.length];
  };

  // Add to recent searches
  const addToRecentSearches = useCallback((item: {type: 'location' | 'person' | 'category', name: string}) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(i => !(i.type === item.type && i.name === item.name));
      const updated = [item, ...filtered].slice(0, 10);
      localStorage.setItem('oratio_recent_searches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem("oratio_feed_visited", "true");
  };

  const toggleFollow = (name: string) => {
    setFollowing((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      localStorage.setItem("oratio_following", JSON.stringify([...next]));
      return next;
    });
  };

  // Build search index from prayers data (locations, people, categories)
  const searchIndex = useMemo(() => {
    const locations = new Map<string, { city: string; country: string; prayerCount: number }>();
    const people = new Set<string>();
    const categories = new Set<string>();
    
    prayers.forEach(p => {
      // Locations: "City, Country"
      const locationKey = `${p.city}, ${p.country}`;
      const existing = locations.get(locationKey);
      if (existing) {
        existing.prayerCount += p.prayerCount;
      } else {
        locations.set(locationKey, { city: p.city, country: p.country, prayerCount: p.prayerCount });
      }
      
      // People (non-anonymous)
      if (p.name) people.add(p.name);
      
      // Categories
      if (p.category) categories.add(p.category);
    });
    
    return { 
      locations: Array.from(locations.entries()).map(([name, data]) => ({ 
        type: 'location' as const,
        name,
        ...data 
      })),
      people: Array.from(people).map(name => ({
        type: 'person' as const,
        name
      })),
      categories: Array.from(categories).map(name => ({
        type: 'category' as const,
        name
      }))
    };
  }, [prayers]);

  // Filter suggestions based on search query
  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    
    // Filter by searchFilter type
    const filterByType = <T extends { type: string }>(items: T[]): T[] => {
      if (searchFilter === 'all') return items;
      return items.filter(item => item.type === searchFilter.slice(0, -1)); // 'people' -> 'person', 'locations' -> 'location', 'categories' -> 'category'
    };
    
    // When query is empty, show recent searches and top suggestions
    if (!q) {
      const sections = [];
      
      // Recent searches section (filtered by type)
      const filteredRecent = filterByType(recentSearches);
      if (filteredRecent.length > 0) {
        sections.push({
          type: 'recent' as const,
          title: 'Recent',
          data: filteredRecent.slice(0, 5),
          icon: Clock
        });
      }
      
      // Top suggestions (3 of each type, filtered by searchFilter)
      const topLocations = searchFilter === 'all' || searchFilter === 'locations' ? searchIndex.locations.slice(0, 3) : [];
      const topPeople = searchFilter === 'all' || searchFilter === 'people' ? searchIndex.people.slice(0, 3) : [];
      const topCategories = searchFilter === 'all' || searchFilter === 'categories' ? searchIndex.categories.slice(0, 3) : [];
      
      if (topLocations.length > 0) {
        sections.push({ type: 'location' as const, title: 'Locations', data: topLocations, icon: MapPin });
      }
      if (topPeople.length > 0) {
        sections.push({ type: 'person' as const, title: 'People', data: topPeople, icon: User });
      }
      if (topCategories.length > 0) {
        sections.push({ type: 'category' as const, title: 'Categories', data: topCategories, icon: Tag });
      }
      
      return sections;
    }
    
    // When query exists, filter results by query and type
    const filterByQuery = (items: Array<{ name: string }>) => 
      items.filter(item => item.name.toLowerCase().includes(q)).slice(0, 5);

    const sections = [];
    if (searchFilter === 'all' || searchFilter === 'locations') {
      const data = filterByQuery(searchIndex.locations);
      if (data.length > 0) sections.push({ type: 'location' as const, title: 'Locations', data, icon: MapPin });
    }
    if (searchFilter === 'all' || searchFilter === 'people') {
      const data = filterByQuery(searchIndex.people);
      if (data.length > 0) sections.push({ type: 'person' as const, title: 'People', data, icon: User });
    }
    if (searchFilter === 'all' || searchFilter === 'categories') {
      const data = filterByQuery(searchIndex.categories);
      if (data.length > 0) sections.push({ type: 'category' as const, title: 'Categories', data, icon: Tag });
    }

    return sections;
  }, [searchIndex, searchQuery, recentSearches, searchFilter]);

  // Flatten suggestions for keyboard navigation
  const allSuggestions = useMemo(() => {
    return filteredSections.flatMap(section => section.data);
  }, [filteredSections]);

  // Reset highlighted index when search query changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightedIndex(-1);
  }, [searchQuery]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: typeof allSuggestions[0]) => {
    switch (suggestion.type) {
      case 'location':
        setSearchQuery(suggestion.name);
        break;
      case 'person':
        setSearchQuery(suggestion.name);
        break;
      case 'category':
        // Set category state to sync with category pills
        setCategory(suggestion.name);
        // Also set search query for visual feedback
        setSearchQuery(suggestion.name);
        break;
    }
    // Add to recent searches (excluding 'recent' section type)
    if (suggestion.type !== 'recent') {
      addToRecentSearches({ type: suggestion.type, name: suggestion.name });
    }
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    // Keep search input focused for further typing
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) input.focus();
    }, 10);
  }, [setCategory, setSearchQuery, setShowSuggestions, setHighlightedIndex, addToRecentSearches]);

  // Keyboard navigation for suggestions
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || allSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : allSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < allSuggestions.length) {
          handleSuggestionSelect(allSuggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  }, [showSuggestions, allSuggestions, highlightedIndex, handleSuggestionSelect]);



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

    if (tab === "nearby") {
      result = result.filter((p) => p.name && following.has(p.name));
    }

    if (category !== "All") {
      result = result.filter((p) => p.category === category);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.text.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.country.toLowerCase().includes(q) ||
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }

    return result;
  }, [prayers, tab, category, searchQuery, following, hasLocationFilter, locationCity, locationCountry]);

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
        <div className="flex items-center justify-between px-5 pt-12 mb-4">
          <h2
            className="text-[#e2e4f0] font-heading tracking-wide"
            style={{ fontSize: "1.35rem", fontWeight: 300 }}
          >
            {hasLocationFilter ? locationCity : "Prayer Feed"}
          </h2>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors"
            style={{
              background: searchOpen
                ? "rgba(124,143,255,0.12)"
                : "rgba(124,143,255,0.06)",
              border: "1px solid rgba(124,143,255,0.1)",
            }}
          >
            {searchOpen ? (
              <X size={16} className="text-[#7c8fff]" />
            ) : (
              <Search size={16} className="text-[#8890b5]" />
            )}
          </button>
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-5 overflow-hidden"
            >
              <div
                className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 mb-3 border border-[rgba(124,143,255,0.15)]"
                style={{ background: "rgba(15, 20, 50, 0.6)" }}
              >
                <Search size={14} className="text-[#5a6080] flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search prayers, cities, people..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleSearchKeyDown}
                  autoFocus
                  className="flex-1 bg-transparent text-[#e2e4f0] placeholder-[#4e5573] text-sm focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-[#5a6080] cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
                </div>

                {/* Search filter pills */}
                <div className="flex gap-1.5 px-1 mb-3 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'all', label: 'All', icon: Search },
                    { id: 'people', label: 'People', icon: User },
                    { id: 'locations', label: 'Locations', icon: MapPin },
                    { id: 'categories', label: 'Categories', icon: Tag },
                  ].map((filter) => {
                    const Icon = filter.icon;
                    const isActive = searchFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => setSearchFilter(filter.id as 'all' | 'people' | 'locations' | 'categories')}
                        className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] transition-all duration-200 cursor-pointer uppercase tracking-wider flex items-center gap-1"
                        style={{
                          background: isActive
                            ? "rgba(124,143,255,0.1)"
                            : "transparent",
                          color: isActive ? "#c5cdff" : "#4e5573",
                          border: isActive
                            ? "1px solid rgba(124,143,255,0.15)"
                            : "1px solid rgba(124,143,255,0.06)",
                        }}
                      >
                        <Icon size={11} />
                        {filter.label}
                      </button>
                    );
                  })}
                </div>

                 {/* Search suggestions dropdown */}
                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div
                      ref={suggestionsRef}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="rounded-xl border border-border/20 overflow-hidden bg-popover/92 backdrop-blur-xl"
                    >
                      {allSuggestions.length > 0 ? (
                        /* Grouped sections */
                        filteredSections.map((section) => (
                          <div key={section.type}>
                            <div className="px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider border-b border-border/20 flex items-center justify-between">
                              <span>{section.title}</span>
                              {section.type === 'recent' && recentSearches.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRecentSearches([]);
                                    localStorage.removeItem('oratio_recent_searches');
                                  }}
                                  className="text-muted-foreground hover:text-foreground text-[10px] normal-case tracking-normal cursor-pointer"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                            {section.data.map((item) => {
                              const flatIndex = allSuggestions.findIndex(s => s.type === item.type && s.name === item.name);
                              return (
                                <button
                                  key={`${item.type}-${item.name}`}
                                  onClick={() => handleSuggestionSelect(item)}
                                  className={`w-full text-left px-4 py-3 text-sm text-foreground hover:bg-accent transition-colors cursor-pointer flex items-center gap-3 ${highlightedIndex === flatIndex ? 'bg-accent' : ''}`}
                                >
                                  {section.type === 'recent' ? (
                                    <Clock size={14} className="text-muted-foreground flex-shrink-0" />
                                  ) : item.type === 'person' ? (
                                    <span className="text-base flex-shrink-0">{getAvatarForName(item.name)}</span>
                                  ) : (
                                    <section.icon size={14} className="text-muted-foreground flex-shrink-0" />
                                  )}
                                  <span className="truncate flex-1">{item.name}</span>
                                  {item.type === 'location' && 'prayerCount' in item && (
                                    <span className="text-xs text-muted-foreground bg-secondary/30 px-1.5 py-0.5 rounded-full">
                                      {item.prayerCount}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ))
                      ) : searchQuery.trim() ? (
                        /* No results state */
                        <div className="py-8 text-center">
                          <Search size={20} className="text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-muted-foreground text-sm">No results for "{searchQuery}"</p>
                          <p className="text-muted-foreground/70 text-xs mt-1">Try a different search term</p>
                          <button
                            onClick={() => setSearchQuery('')}
                            className="mt-3 px-3 py-1.5 text-xs text-foreground/70 bg-secondary/30 rounded-full hover:bg-secondary/50 transition-colors cursor-pointer"
                          >
                            Clear search
                          </button>
                        </div>
                      ) : (
                        /* Empty query and no recent/top suggestions (should not happen) */
                        <div className="py-8 text-center">
                          <Clock size={20} className="text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-muted-foreground text-sm">Start typing to search</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
             </motion.div>
          )}
        </AnimatePresence>

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

        {/* Category pills */}
        <div className="flex gap-1.5 px-5 pb-4 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isActive = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="flex-shrink-0 px-3 py-1 rounded-full text-[11px] transition-all duration-200 cursor-pointer uppercase tracking-wider"
                style={{
                  background: isActive
                    ? "rgba(124,143,255,0.1)"
                    : "transparent",
                  color: isActive ? "#c5cdff" : "#4e5573",
                  border: isActive
                    ? "1px solid rgba(124,143,255,0.15)"
                    : "1px solid rgba(124,143,255,0.06)",
                }}
              >
                {cat}
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
                onFollow={toggleFollow}
                following={following}
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
                      {selectedPrayer.name && (() => {
                         const name = selectedPrayer.name;
                        return (
                          <div className="flex items-center gap-2.5 mb-4">
                            <p className="text-[#6b7499] text-sm">
                              &mdash; {name}
                            </p>
                            <motion.button
                              onClick={() => toggleFollow(name)}
                              whileTap={{ scale: 0.95 }}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] transition-all duration-200 cursor-pointer ${following.has(name) ? 'bg-[rgba(110,231,183,0.1)] text-[#6ee7b7] border border-[rgba(110,231,183,0.2)]' : 'bg-[rgba(124,143,255,0.06)] text-[#6b7499] border border-[rgba(124,143,255,0.1)]'}`}
                            >
                              {following.has(name) ? (
                                <>
                                  <UserCheck size={10} />
                                  Following
                                </>
                              ) : (
                                <>
                                  <UserPlus size={10} />
                                  Follow
                                </>
                              )}
                            </motion.button>
                          </div>
                        );
                      })()}

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