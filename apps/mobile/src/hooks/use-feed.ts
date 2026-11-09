import { useCallback, useEffect, useRef, useState } from 'react';
import { getFeedPrayers } from '@oratio/shared/queries';
import { isPrayerArchived, type PrayerRequest } from '@oratio/shared/prayer-data';
import { usePrayerClock } from './use-prayer-clock';
import { withRequestTimeout } from '../services/request-timeout';
import type { FeedAudienceMode, FeedPrayerFilters } from '@oratio/shared/queries';

const PAGE_SIZE = 20;

type UseFeedOptions = Pick<FeedPrayerFilters, 'country' | 'savedOnly' | 'search'>;

export function useFeed(audienceMode: FeedAudienceMode = 'public', options: UseFeedOptions = {}) {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const now = usePrayerClock(prayers);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const cursorRef = useRef<string | undefined>(undefined);
  const generation = useRef(0);
  const resetting = useRef(false);
  const paging = useRef(false);
  const country = options.country?.trim() || undefined;
  const savedOnly = options.savedOnly === true;
  const search = options.search?.trim() || undefined;

  const fetchPage = useCallback(
    (cursor?: string) => {
      const filters: FeedPrayerFilters = {};
      if (country) filters.country = country;
      if (savedOnly) filters.savedOnly = true;
      if (search) filters.search = search;

      return withRequestTimeout(
        getFeedPrayers(cursor, PAGE_SIZE, audienceMode, filters, { throwOnError: true })
      );
    },
    [audienceMode, country, savedOnly, search]
  );

  const load = useCallback(
    async (isRefresh = false) => {
      const request = ++generation.current;
      resetting.current = true;
      paging.current = false;
      setLoadingMore(false);
      setPageError(null);
      if (isRefresh) setRefreshing(true);
      else {
        setLoading(true);
        setPrayers([]);
      }
      setError(null);
      try {
        const data = await fetchPage();
        if (request !== generation.current) return;
        setPrayers(data);
        cursorRef.current = data.length > 0 ? data[data.length - 1].createdAt : undefined;
        setHasMore(data.length >= PAGE_SIZE);
      } catch {
        if (request === generation.current)
          setError("We couldn't load prayers. Check your connection and try again.");
      } finally {
        if (request === generation.current) {
          resetting.current = false;
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [fetchPage]
  );

  const cancel = useCallback(() => {
    generation.current += 1;
    resetting.current = true;
    setPrayers([]);
    setHasMore(false);
    cursorRef.current = undefined;
  }, []);
  useEffect(() => cancel, [cancel, fetchPage]);

  const refresh = useCallback(() => load(true), [load]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !cursorRef.current || paging.current || resetting.current || error) return;
    const request = generation.current;
    paging.current = true;
    setLoadingMore(true);
    setPageError(null);
    try {
      const data = await fetchPage(cursorRef.current);
      if (request !== generation.current) return;
      if (data.length < PAGE_SIZE) setHasMore(false);
      if (data.length > 0) cursorRef.current = data[data.length - 1].createdAt;
      setPrayers((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [
          ...prev,
          ...data.filter((p) => {
            if (ids.has(p.id)) return false;
            ids.add(p.id);
            return true;
          }),
        ];
      });
    } catch {
      if (request === generation.current) setPageError("We couldn't load more prayers.");
    } finally {
      if (request === generation.current) {
        paging.current = false;
        setLoadingMore(false);
      }
    }
  }, [fetchPage, hasMore, error]);

  // The screen drives loading: FeedScreen calls load() via useFocusEffect so
  // the list refreshes on first focus and whenever the user returns to it.
  return {
    prayers: prayers.filter((prayer) => !isPrayerArchived(prayer, now)),
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    pageError,
    refresh,
    loadMore,
    load,
    cancel,
  };
}
