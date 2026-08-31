import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getPrayerLocationKey,
  normalizePrayerLocation,
  type PrayerRequest,
} from '../../services/prayer-data';
import {
  getFeedPrayers,
  getMyPrayedIds,
  getMySavedIds,
  getPrayerCircleMemberIds,
  togglePray,
} from '../../services/supabase-queries';

type NormalizedLocation = { city: string; country: string };

type UseFeedDataArgs = {
  locationCity: string | null;
  locationCountry: string | null;
  normalizedLocationFilter: NormalizedLocation | null;
  showSaved: boolean;
  showPrayerCircle: boolean;
  activeSearch: string;
};

export function useFeedData({
  locationCity,
  locationCountry,
  normalizedLocationFilter,
  showSaved,
  showPrayerCircle,
  activeSearch,
}: UseFeedDataArgs) {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [prayedIds, setPrayedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [prayerCircleMemberIds, setPrayerCircleMemberIds] = useState<string[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadPrayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFeedPrayers(undefined, 20, showPrayerCircle ? 'circle' : 'public');
      setPrayers(data);
      setCursor(data.length > 0 ? data[data.length - 1].createdAt : undefined);
      setHasMore(data.length >= 20);
    } catch {
      setError('Failed to load prayers');
    }
    setLoading(false);
  }, [showPrayerCircle]);

  // Load Prayer Circle list, prayed IDs, and saved IDs from Supabase
  useEffect(() => {
    let active = true;

    const loadUserState = async () => {
      const [circleIds, prayed, saved] = await Promise.all([
        getPrayerCircleMemberIds(true),
        getMyPrayedIds(),
        getMySavedIds(),
      ]);

      if (!active) return;
      setPrayerCircleMemberIds(circleIds);
      setPrayedIds(prayed);
      setSavedIds(saved);
    };

    void loadUserState();

    return () => {
      active = false;
    };
  }, []);

  // Listen for prayer addition/deletion via custom events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAdd = (e: Event) => {
      const prayer = (e as CustomEvent).detail as PrayerRequest;
      const prayerAudience = prayer.audience || 'public';
      const belongsInCurrentView = showPrayerCircle
        ? prayerAudience === 'circle'
        : prayerAudience === 'public';

      if (!belongsInCurrentView) return;

      setPrayers((prev) => {
        if (prev.some((p) => p.id === prayer.id)) return prev;
        return [prayer, ...prev];
      });
    };

    const handleRemove = (e: Event) => {
      const prayerId = (e as CustomEvent).detail as string;
      setPrayers((prev) => prev.filter((p) => p.id !== prayerId));
    };

    const handleUpdate = (e: Event) => {
      const update = (e as CustomEvent).detail as {
        prayerId: string;
        text: string;
        editedAt: string;
      };
      setPrayers((prev) =>
        prev.map((prayer) =>
          prayer.id === update.prayerId
            ? { ...prayer, text: update.text, editedAt: update.editedAt }
            : prayer
        )
      );
    };

    window.addEventListener('oratio-prayer-added', handleAdd);
    window.addEventListener('oratio-prayer-removed', handleRemove);
    window.addEventListener('oratio-prayer-updated', handleUpdate);

    return () => {
      window.removeEventListener('oratio-prayer-added', handleAdd);
      window.removeEventListener('oratio-prayer-removed', handleRemove);
      window.removeEventListener('oratio-prayer-updated', handleUpdate);
    };
  }, [showPrayerCircle]);

  const filteredPrayers = useMemo(() => {
    let result = prayers;

    if (showPrayerCircle && prayerCircleMemberIds.length <= 1) {
      return [];
    }

    // Location filter from map hotspot or country filter
    if (locationCity && normalizedLocationFilter) {
      const filterKey = getPrayerLocationKey(
        normalizedLocationFilter.city,
        normalizedLocationFilter.country
      );
      result = result.filter((p) => getPrayerLocationKey(p.city, p.country) === filterKey);
    } else if (locationCountry && normalizedLocationFilter) {
      // Country-only filter
      result = result.filter((p) => {
        const location = normalizePrayerLocation(p.city, p.country);
        return location.country.toLowerCase() === normalizedLocationFilter.country.toLowerCase();
      });
    }

    // Saved filter
    if (showSaved) {
      result = result.filter((p) => savedIds.includes(p.id));
    }

    // Search filter
    if (activeSearch) {
      const q = activeSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.text.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.country.toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [
    prayers,
    locationCity,
    locationCountry,
    normalizedLocationFilter,
    showSaved,
    showPrayerCircle,
    prayerCircleMemberIds.length,
    savedIds,
    activeSearch,
  ]);

  // Infinite scroll — load more prayers when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          setLoadingMore(true);
          getFeedPrayers(cursor, 20, showPrayerCircle ? 'circle' : 'public')
            .then((data) => {
              if (data.length < 20) setHasMore(false);
              if (data.length > 0) setCursor(data[data.length - 1].createdAt);
              setPrayers((prev) => {
                const existingIds = new Set(prev.map((prayer) => prayer.id));
                return [...prev, ...data.filter((prayer) => !existingIds.has(prayer.id))];
              });
              setLoadingMore(false);
            })
            .catch(() => setLoadingMore(false));
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, hasMore, loadingMore, showPrayerCircle]);

  // Reload prayers when filters change
  useEffect(() => {
    const reload = async () => {
      setCursor(undefined);
      setHasMore(true);
      await loadPrayers();
    };

    void reload();
  }, [loadPrayers, locationCity, locationCountry, showSaved, showPrayerCircle]);

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
        return prev.filter((pId) => pId !== id);
      }
      return prev;
    });
  }, []);

  const hasLocationFilter = !!locationCity || !!locationCountry;
  const locationDisplayName = normalizedLocationFilter
    ? [
        locationCity ? normalizedLocationFilter.city : null,
        normalizedLocationFilter.country !== 'Unknown' ? normalizedLocationFilter.country : null,
      ]
        .filter(Boolean)
        .join(', ') || normalizedLocationFilter.city
    : '';

  const emptyStateTitle = showSaved
    ? 'No saved prayers yet'
    : showPrayerCircle
      ? prayerCircleMemberIds.length <= 1
        ? 'Your Prayer Circle is empty'
        : 'No Prayer Circle prayers yet'
      : hasLocationFilter
        ? `No prayers in ${locationDisplayName}`
        : 'No prayers found';

  const emptyStateDescription = showSaved
    ? 'Tap ⋯ on a prayer and choose Save, or save from the prayer detail page'
    : showPrayerCircle
      ? prayerCircleMemberIds.length <= 1
        ? 'Invite someone from a prayer or profile to start your Prayer Circle'
        : 'Prayers shared with your Prayer Circle will appear here'
      : hasLocationFilter
        ? 'View all prayers'
        : 'View all prayers';

  return {
    prayers,
    loading,
    error,
    loadingMore,
    hasMore,
    sentinelRef,
    loadPrayers,
    filteredPrayers,
    emptyStateTitle,
    emptyStateDescription,
    prayedIds,
    togglePrayed,
    prayerCircleMemberIds,
    hasLocationFilter,
    locationDisplayName,
  };
}
