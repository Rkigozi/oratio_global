import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './hooks/auth-context';
import { ThemeProvider } from './hooks/theme-context';
import { ActivityUpdatesProvider } from './hooks/activity-updates-context';
import { ErrorBoundary } from './components/error-boundary';
import { useEffect } from 'react';
import { capturePageView } from '../lib/analytics';
import { useAuth } from './hooks/auth-context';
import { preloadAuthenticatedRoutes, preloadPublicRoutes } from './route-loaders';

const SERVICE_WORKER_RELOAD_KEY = 'oratio:sw-controller-reload-at';
const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;
const CONTROLLER_RELOAD_COOLDOWN_MS = 30_000;

function ServiceWorkerUpdater() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let intervalId: number | undefined;
    let removeVisibilityListener: (() => void) | undefined;

    const handleControllerChange = () => {
      try {
        const lastReload = Number(sessionStorage.getItem(SERVICE_WORKER_RELOAD_KEY) ?? 0);
        if (Date.now() - lastReload < CONTROLLER_RELOAD_COOLDOWN_MS) return;
        sessionStorage.setItem(SERVICE_WORKER_RELOAD_KEY, String(Date.now()));
      } catch {
        // Storage can be unavailable in private browsing; the reload is still useful.
      }

      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        const checkForUpdate = () => {
          if (document.visibilityState === 'visible') void registration.update();
        };

        checkForUpdate();
        intervalId = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
        document.addEventListener('visibilitychange', checkForUpdate);
        removeVisibilityListener = () => {
          document.removeEventListener('visibilitychange', checkForUpdate);
        };
      })
      .catch(() => {
        // SW registration can fail on some iOS browsers; the app can still run online.
      });

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      removeVisibilityListener?.();
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return null;
}

function AnalyticsRouteTracker() {
  useEffect(() => {
    let lastPath = '';

    const trackCurrentRoute = () => {
      const { pathname, search, hash } = router.state.location;
      const path = `${pathname}${search}${hash}`;
      if (path === lastPath) return;
      lastPath = path;
      capturePageView(path);
    };

    trackCurrentRoute();
    return router.subscribe(trackCurrentRoute);
  }, []);

  return null;
}

function RouteModulePreloader() {
  const { loading, user } = useAuth();

  useEffect(() => {
    if (loading) return;

    const timerId = window.setTimeout(() => {
      if (user) {
        preloadAuthenticatedRoutes();
      } else {
        preloadPublicRoutes();
      }
    }, 900);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loading, user]);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ActivityUpdatesProvider>
            <div
              style={{
                width: '100%',
                height: '100dvh',
                minHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--color-bg)',
                color: 'rgb(var(--rgb-text))',
              }}
            >
              <RouterProvider router={router} />
              <AnalyticsRouteTracker />
              <RouteModulePreloader />
              <ServiceWorkerUpdater />
            </div>
          </ActivityUpdatesProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
