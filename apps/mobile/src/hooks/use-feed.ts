import { useCallback, useRef, useState } from 'react';
import { getFeedPrayers } from '@oratio/shared/queries';
import type { PrayerRequest } from '@oratio/shared/prayer-data';
import type { FeedAudienceMode, FeedPrayerFilters } from '@oratio/shared/queries';

const PAGE_SIZE = 20;

type UseFeedOptions = Pick<FeedPrayerFilters, 'country' | 'savedOnly' | 'search'>;

export function useFeed(audienceMode: FeedAudienceMode = 'public', options: UseFeedOptions = {}) {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | undefined>(undefined);
  const country = options.country?.trim() || undefined;
  const savedOnly = options.savedOnly === true;
  const search = options.search?.trim() || undefined;

  const fetchPage = useCallback(
    (cursor?: string) => {
      const filters: FeedPrayerFilters = {};
      if (country) filters.country = country;
      if (savedOnly) filters.savedOnly = true;
      if (search) filters.search = search;

      return Object.keys(filters).length > 0
        ? getFeedPrayers(cursor, PAGE_SIZE, audienceMode, filters)
        : getFeedPrayers(cursor, PAGE_SIZE, audienceMode);
    },
    [audienceMode, country, savedOnly, search]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPage();
      setPrayers(data);
      cursorRef.current = data.length > 0 ? data[data.length - 1].createdAt : undefined;
      setHasMore(data.length >= PAGE_SIZE);
    } catch {
      setError('Failed to load prayers');
    }
    setLoading(false);
  }, [fetchPage]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(cursorRef.current);
      if (data.length < PAGE_SIZE) setHasMore(false);
      if (data.length > 0) cursorRef.current = data[data.length - 1].createdAt;
      setPrayers((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...data.filter((p) => !ids.has(p.id))];
      });
    } catch {
      // Pagination failures are non-fatal; the next scroll retries.
    }
    setLoadingMore(false);
  }, [fetchPage, hasMore, loadingMore]);

  // The screen drives loading: FeedScreen calls load() via useFocusEffect so
  // the list refreshes on first focus and whenever the user returns to it.
  return { prayers, loading, refreshing, loadingMore, hasMore, error, refresh, loadMore, load };
}
