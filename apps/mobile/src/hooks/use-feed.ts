import { useCallback, useEffect, useRef, useState } from 'react';
import { getFeedPrayers } from '@oratio/shared/queries';
import type { PrayerRequest } from '@oratio/shared/prayer-data';

const PAGE_SIZE = 20;

export function useFeed() {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFeedPrayers(undefined, PAGE_SIZE, 'public');
      setPrayers(data);
      cursorRef.current = data.length > 0 ? data[data.length - 1].createdAt : undefined;
      setHasMore(data.length >= PAGE_SIZE);
    } catch {
      setError('Failed to load prayers');
    }
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await getFeedPrayers(cursorRef.current, PAGE_SIZE, 'public');
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
  }, [hasMore, loadingMore]);

  useEffect(() => {
    void load();
  }, [load]);

  return { prayers, loading, refreshing, loadingMore, hasMore, error, refresh, loadMore, load };
}
