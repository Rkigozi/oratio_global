import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getUnreadActivityCount, subscribeToActivityEventChanges } from '@oratio/shared/queries';
import { useAuth } from './auth-context';

const ACTIVITY_POLL_INTERVAL_MS = 30_000;

type ActivityUpdatesContextValue = {
  unreadCount: number;
  liveVersion: number;
  refreshUnreadCount: () => Promise<number>;
};

const ActivityUpdatesContext = createContext<ActivityUpdatesContextValue>({
  unreadCount: 0,
  liveVersion: 0,
  refreshUnreadCount: () => Promise.resolve(0),
});

export function ActivityUpdatesProvider({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  const userId = user?.id ?? null;
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveVersion, setLiveVersion] = useState(0);
  const latestCountRef = useRef(0);

  const setCount = useCallback((count: number) => {
    setUnreadCount(count);
    if (latestCountRef.current !== count) {
      latestCountRef.current = count;
      setLiveVersion((version) => version + 1);
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!userId) {
      setCount(0);
      return 0;
    }

    try {
      const count = await getUnreadActivityCount();
      setCount(count);
      return count;
    } catch {
      return latestCountRef.current;
    }
  }, [setCount, userId]);

  useEffect(() => {
    if (loading) return;
    void refreshUnreadCount();
  }, [loading, refreshUnreadCount]);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    const refreshLiveActivity = () => {
      if (!active) return;
      setLiveVersion((version) => version + 1);
      void refreshUnreadCount();
    };
    const unsubscribe = subscribeToActivityEventChanges(userId, refreshLiveActivity);
    const appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') refreshLiveActivity();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') refreshLiveActivity();
    }, ACTIVITY_POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
      appStateSubscription.remove();
      unsubscribe();
    };
  }, [refreshUnreadCount, userId]);

  const value = useMemo(
    () => ({ unreadCount, liveVersion, refreshUnreadCount }),
    [liveVersion, refreshUnreadCount, unreadCount]
  );

  return (
    <ActivityUpdatesContext.Provider value={value}>{children}</ActivityUpdatesContext.Provider>
  );
}

export function useActivityUpdates() {
  return useContext(ActivityUpdatesContext);
}
