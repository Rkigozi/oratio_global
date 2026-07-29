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
import { getUnreadActivityCount } from '../services/supabase-queries';
import { supabase } from '../services/supabase';
import { useAuth } from './auth-context';

const ACTIVITY_UPDATED_EVENT = 'oratio-activity-updated';
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
      return latestCountRef.current;
    }

    const count = await getUnreadActivityCount();
    setCount(count);
    return count;
  }, [setCount, userId]);

  useEffect(() => {
    if (loading) return;

    const timerId = window.setTimeout(() => {
      if (!userId) {
        setCount(0);
        return;
      }

      void refreshUnreadCount();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loading, refreshUnreadCount, setCount, userId]);

  useEffect(() => {
    if (!userId) return;

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshUnreadCount();
    };
    const refresh = () => void refreshUnreadCount();

    window.addEventListener(ACTIVITY_UPDATED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    const intervalId = window.setInterval(refreshWhenVisible, ACTIVITY_POLL_INTERVAL_MS);

    const channel = supabase
      .channel(`activity-events:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_events',
          filter: `recipient_user_id=eq.${userId}`,
        },
        () => {
          void refreshUnreadCount();
        }
      )
      .subscribe((status) => {
        if (String(status) === 'SUBSCRIBED') void refreshUnreadCount();
      });

    return () => {
      window.removeEventListener(ACTIVITY_UPDATED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
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
