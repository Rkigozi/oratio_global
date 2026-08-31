const FEED_SCROLL_SNAPSHOT_KEY = 'oratio_feed_scroll_snapshot';
const FEED_SCROLL_SNAPSHOT_MAX_AGE_MS = 10 * 60 * 1000;

export type FeedScrollSnapshot = {
  path: string;
  scrollTop: number;
  prayerId?: string;
  showSaved: boolean;
  showPrayerCircle: boolean;
  searchQuery: string;
  activeSearch: string;
  savedAt: number;
};

export function getFeedPath(search: string) {
  return `/feed${search}`;
}

export function readFeedScrollSnapshot(search: string): FeedScrollSnapshot | null {
  try {
    const raw = sessionStorage.getItem(FEED_SCROLL_SNAPSHOT_KEY);
    if (!raw) return null;

    const snapshot = JSON.parse(raw) as FeedScrollSnapshot;
    const isFresh = Date.now() - snapshot.savedAt < FEED_SCROLL_SNAPSHOT_MAX_AGE_MS;
    if (!isFresh || snapshot.path !== getFeedPath(search)) return null;

    return snapshot;
  } catch {
    return null;
  }
}

export function writeFeedScrollSnapshot(snapshot: FeedScrollSnapshot) {
  try {
    sessionStorage.setItem(FEED_SCROLL_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

export function clearFeedScrollSnapshot() {
  try {
    sessionStorage.removeItem(FEED_SCROLL_SNAPSHOT_KEY);
  } catch {
    /* ignore */
  }
}
