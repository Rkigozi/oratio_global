import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X, Search, ChevronDown, Users } from 'lucide-react';
import { useSearchParams, useNavigate, useLocation } from 'react-router';
import { countries, normalizePrayerLocation, type PrayerRequest } from '../../services/prayer-data';
import { FeedCard } from '../../components/feed/feed-card';
import { getHashtagCounts } from '../../services/hashtags';
import { useGeolocation } from '../../hooks/use-geolocation';
import { useFeedData } from './use-feed-data';
import { useFeedSearch } from './use-feed-search';
import {
  clearFeedScrollSnapshot,
  getFeedPath,
  readFeedScrollSnapshot,
  writeFeedScrollSnapshot,
  type FeedScrollSnapshot,
} from './feed-scroll-snapshot';
import { LoadingSpinner, ErrorState } from '../../components/loading-spinner';

export function Feed() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { location: geoLocation } = useGeolocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [initialScrollSnapshot] = useState(() => readFeedScrollSnapshot(location.search));
  const initialScrollSnapshotRef = useRef<FeedScrollSnapshot | null>(initialScrollSnapshot);
  const restoreAttemptCountRef = useRef(0);
  const locationCity = searchParams.get('city');
  const locationCountry = searchParams.get('country');
  const hasLocationFilter = !!locationCity || !!locationCountry;
  const normalizedLocationFilter = useMemo(
    () =>
      hasLocationFilter
        ? normalizePrayerLocation(locationCity || 'Unknown', locationCountry || 'Unknown')
        : null,
    [hasLocationFilter, locationCity, locationCountry]
  );

  const clearLocationFilter = () => {
    setSearchParams({});
  };

  const [showSaved, setShowSaved] = useState(() => initialScrollSnapshot?.showSaved ?? false);
  const [showPrayerCircle, setShowPrayerCircle] = useState(
    () => searchParams.get('circle') === '1'
  );

  const searchParamActive = searchParams.get('search') || '';
  const initialSearchQuery = searchParamActive || initialScrollSnapshot?.searchQuery || '';

  const search = useFeedSearch(initialSearchQuery);
  const {
    searchQuery,
    setSearchQuery,
    activeSearch,
    setActiveSearch,
    showRecent,
    setShowRecent,
    recentSearches,
    userResults,
    searchingUsers,
    searchRef,
    removeRecentSearch,
    handleSearchSubmit,
    handleRecentClick,
    handleTagClick,
  } = search;

  const locationFilterKey = `${locationCity || ''}:${locationCountry || ''}`;
  const [openCountryFilterKey, setOpenCountryFilterKey] = useState<string | null>(null);
  const showCountryFilter = openCountryFilterKey === locationFilterKey;
  const setShowCountryFilter = useCallback(
    (open: boolean) => {
      setOpenCountryFilterKey(open ? locationFilterKey : null);
    },
    [locationFilterKey]
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    loading,
    error,
    hasMore,
    sentinelRef,
    loadPrayers,
    filteredPrayers,
    emptyStateTitle,
    emptyStateDescription,
    prayedIds,
    togglePrayed,
    prayerCircleMemberIds,
    locationDisplayName,
  } = useFeedData({
    locationCity,
    locationCountry,
    normalizedLocationFilter,
    showSaved,
    showPrayerCircle,
    activeSearch,
  });

  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      return !localStorage.getItem('oratio_feed_visited');
    } catch {
      return true;
    }
  });

  const trendingHashtags = useMemo(() => getHashtagCounts(filteredPrayers), [filteredPrayers]);

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
  }, [setShowCountryFilter, showCountryFilter]);

  const dismissWelcome = () => {
    setShowWelcome(false);
    try {
      localStorage.setItem('oratio_feed_visited', 'true');
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const snapshot = initialScrollSnapshotRef.current;
    const scroller = scrollContainerRef.current;
    if (!snapshot || !scroller || loading || error) return;

    const timerId = window.setTimeout(() => {
      const maxScrollTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      scroller.scrollTop = Math.min(snapshot.scrollTop, maxScrollTop);
      restoreAttemptCountRef.current += 1;

      const restored = Math.abs(scroller.scrollTop - snapshot.scrollTop) <= 8;
      if (restored || !hasMore || restoreAttemptCountRef.current >= 12) {
        clearFeedScrollSnapshot();
        initialScrollSnapshotRef.current = null;
      }
    }, 80);

    return () => window.clearTimeout(timerId);
  }, [error, hasMore, loading, filteredPrayers.length]);

  useEffect(() => {
    setShowPrayerCircle(searchParams.get('circle') === '1');
  }, [searchParams]);

  const handleTap = (prayer: PrayerRequest) => {
    writeFeedScrollSnapshot({
      path: getFeedPath(location.search),
      scrollTop: scrollContainerRef.current?.scrollTop ?? 0,
      prayerId: prayer.id,
      showSaved,
      showPrayerCircle,
      searchQuery,
      activeSearch,
      savedAt: Date.now(),
    });

    void navigate(`/prayer/${prayer.id}`);
  };

  const filterPillClass =
    'flex-shrink-0 min-h-11 px-4 py-2 rounded-full text-[13px] transition-all duration-300 cursor-pointer';
  const filterPillWithIconClass = `${filterPillClass} flex items-center gap-1.5`;

  const activePillStyle = (isActive: boolean) => ({
    background: isActive
      ? 'rgba(var(--rgb-accent), 0.12)'
      : 'rgba(var(--rgb-accent), 0.04)',
    border: isActive ? '1px solid rgba(var(--rgb-accent), 0.2)' : '1px solid rgba(var(--rgb-accent), 0.06)',
    color: isActive ? 'rgb(var(--rgb-accent))' : 'rgb(var(--rgb-text-muted))',
  });

  const visiblePrayers = filteredPrayers;

  return (
    <div className="w-full h-full flex flex-col" style={{ background: 'rgb(var(--rgb-bg))' }}>
      {/* Fixed header area */}
      <div
        className="sticky top-0 z-20 pb-0 flex-shrink-0"
        style={{
          paddingTop: 'calc(3.5rem + env(safe-area-inset-top))',
          background:
            'linear-gradient(to bottom, rgba(var(--rgb-bg), 0.98) 70%, rgba(var(--rgb-bg), 0))',
        }}
      >
        {/* Filter pills row */}
        <div className="px-5 mb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {/* All */}
          <button
            onClick={() => {
              setSearchParams({});
              setShowSaved(false);
              setShowPrayerCircle(false);
            }}
            className={filterPillClass}
            style={activePillStyle(!hasLocationFilter && !showSaved && !showPrayerCircle)}
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
                } else if (city && city !== 'Unknown') {
                  setSearchParams({ city, country });
                } else if (country && country !== 'Unknown') {
                  setSearchParams({ country });
                }
              }}
              className={filterPillWithIconClass}
              style={activePillStyle(hasLocationFilter)}
            >
              <MapPin size={12} />
              Near Me
            </button>
          )}

          {/* Prayer Circle */}
          <button
            onClick={() => {
              const next = !showPrayerCircle;
              setShowPrayerCircle(next);
              if (next) setShowSaved(false);
              setSearchParams(next ? { circle: '1' } : {});
            }}
            className={filterPillClass}
            style={{
              ...activePillStyle(showPrayerCircle),
              opacity: prayerCircleMemberIds.length <= 1 ? 0.65 : 1,
            }}
          >
            Prayer Circle
          </button>

          {/* Saved */}
          <button
            onClick={() => {
              const next = !showSaved;
              setShowSaved(next);
              if (next) setShowPrayerCircle(false);
              if (next) setSearchParams({});
            }}
            className={filterPillClass}
            style={activePillStyle(showSaved)}
          >
            Saved
          </button>

          {/* Country — opens filter */}
          <button
            onClick={() => setShowCountryFilter(!showCountryFilter)}
            className={filterPillWithIconClass}
            style={activePillStyle(hasLocationFilter)}
          >
            <span>{locationCountry || 'Country'}</span>
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
                className="absolute top-0 left-5 w-48 max-h-60 overflow-y-auto rounded-xl border border-accent/15 z-20"
                style={{
                  background: 'rgba(var(--rgb-surface), 0.98)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <button
                  onClick={() => {
                    setSearchParams({});
                    setShowCountryFilter(false);
                  }}
                  className="w-full min-h-11 text-left px-4 py-3 text-sm text-text-secondary hover:bg-accent/10 transition-colors cursor-pointer truncate"
                >
                  All Countries
                </button>
                {countries.map((country) => (
                  <button
                    key={country}
                    onClick={() => {
                      setSearchParams({ country });
                      setShowCountryFilter(false);
                    }}
                    className="w-full min-h-11 text-left px-4 py-3 text-sm text-text-secondary hover:bg-accent/10 transition-colors cursor-pointer truncate"
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
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowRecent(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchSubmit();
                if (e.key === 'Escape') {
                  setShowRecent(false);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="Search prayers..."
              className="w-full min-h-11 rounded-xl pl-9 pr-11 py-3 text-text placeholder-text-dim text-sm focus:outline-none border border-accent/10 focus:border-accent/30 transition-colors"
              style={{ background: 'rgba(var(--rgb-surface), 0.6)' }}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveSearch('');
                  setSearchParams({});
                }}
                className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full text-text-dim hover:text-text-muted hover:bg-accent/6 transition-colors cursor-pointer flex items-center justify-center"
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
                  background: 'rgba(var(--rgb-surface), 0.98)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                <div className="px-3 py-2 text-text-dim text-[10px] uppercase tracking-wider">
                  Recent searches
                </div>
                {recentSearches.map((q) => (
                  <div
                    key={q}
                    className="flex items-center gap-2 px-3 py-2.5 hover:bg-accent/6 transition-colors group"
                  >
                    <button
                      onClick={() => handleRecentClick(q)}
                      className="flex-1 min-h-10 min-w-0 text-left text-text-secondary text-xs truncate cursor-pointer"
                    >
                      {q}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentSearch(q);
                      }}
                      className="h-10 w-10 rounded-full text-text-faint hover:text-text-muted hover:bg-accent/6 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 flex items-center justify-center"
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
        {!searchQuery && !showSaved && !showPrayerCircle && trendingHashtags.length > 0 && (
          <div className="px-5 mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-text-dim text-[9px] uppercase tracking-wider">Trending</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {trendingHashtags.slice(0, 8).map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag.replace('#', ''))}
                  className="flex-shrink-0 min-h-10 px-3 py-2 rounded-full text-[11px] transition-all cursor-pointer"
                  style={{
                    background: 'rgba(var(--rgb-accent), 0.06)',
                    border: '1px solid rgba(var(--rgb-accent), 0.1)',
                    color: 'rgb(var(--rgb-accent))',
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
      <div
        ref={scrollContainerRef}
        data-testid="feed-scroll-container"
        className="flex-1 px-4 overflow-y-auto pb-28"
      >
        {/* Search banner */}
        <AnimatePresence>
          {activeSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-2"
            >
              <div
                className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{
                  background: 'rgba(var(--rgb-accent), 0.06)',
                  border: '1px solid rgba(var(--rgb-accent), 0.1)',
                }}
              >
                <Search size={14} className="text-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-text-secondary text-sm">
                    Searching for &quot;
                    <span style={{ color: 'rgb(var(--rgb-accent))' }}>{activeSearch}</span>&quot;
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveSearch('');
                  }}
                  className="h-11 w-11 -mr-2 rounded-full text-text-dim hover:text-text-muted hover:bg-accent/6 cursor-pointer flex-shrink-0 flex items-center justify-center"
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
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-4"
            >
              <div className="oratio-surface rounded-xl px-4 py-3.5 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-text-secondary text-sm mb-0.5">Prayer feed</p>
                  <p className="text-text-muted text-xs">
                    Read, pray, or leave encouragement when someone is on your heart.
                  </p>
                </div>
                <button
                  onClick={dismissWelcome}
                  className="h-11 w-11 -mr-2 -mt-2 rounded-full text-text-dim hover:text-text-muted hover:bg-accent/6 cursor-pointer flex-shrink-0 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section label */}
        <div className="flex items-center justify-between gap-3 px-1 mb-3">
          <span className="oratio-section-label min-w-0 truncate">
            {showSaved
              ? 'Saved'
              : showPrayerCircle
                ? 'Prayer Circle'
                : hasLocationFilter
                  ? `Prayers from ${locationDisplayName}`
                  : 'Latest'}
          </span>
          <span className="flex-shrink-0 text-text-faint text-[10px]">
            {filteredPrayers.length} prayers
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
                    className="flex min-h-12 items-center gap-3 px-3 py-3 rounded-xl cursor-pointer hover:bg-accent/4 transition-colors"
                  >
                    <img
                      src={`https://ui-avatars.com/api/?name=${u.username[0].toUpperCase()}&background=7c8fff&color=fff&size=32&font-size=0.5`}
                      alt={u.username || 'User'}
                      className="w-9 h-9 rounded-full object-cover"
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
        {error && <ErrorState message={error} onRetry={() => void loadPrayers()} />}

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
                {hasMore ? (
                  <div ref={sentinelRef} className="h-4" />
                ) : (
                  <p className="text-center text-text-faint text-[10px] pt-2 pb-1">
                    All prayers loaded
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
                      'radial-gradient(circle, rgba(var(--rgb-accent), 0.08), transparent)',
                  }}
                >
                  {showSaved ? (
                    <span className="text-xl text-text-dim">📖</span>
                  ) : showPrayerCircle ? (
                    <Users size={20} className="text-text-dim" />
                  ) : hasLocationFilter ? (
                    <MapPin size={20} className="text-text-dim" />
                  ) : (
                    <Search size={20} className="text-text-dim" />
                  )}
                </div>
                <p className="text-text-muted text-sm mb-1">{emptyStateTitle}</p>
                <p className="text-text-dim text-xs">{emptyStateDescription}</p>
                {hasLocationFilter ? (
                  <div className="flex flex-col items-center gap-2 mt-4">
                    <button
                      onClick={clearLocationFilter}
                      className="min-h-11 px-5 py-2 rounded-full text-xs text-text-muted bg-accent/4 border border-accent/8 cursor-pointer hover:bg-accent/8 transition-all"
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
