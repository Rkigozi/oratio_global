import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './hooks/auth-context';
import { ThemeProvider } from './hooks/theme-context';
import { ActivityUpdatesProvider } from './hooks/activity-updates-context';
import { ErrorBoundary } from './components/error-boundary';
import { useEffect, useRef } from 'react';
import { capturePageView } from '../lib/analytics';
import { useAuth } from './hooks/auth-context';
import { getLaunchRedirect, isStandaloneLaunch } from './launch-route';
import { preloadAuthenticatedRoutes } from './route-loaders';

const SERVICE_WORKER_RELOAD_KEY = 'oratio:sw-controller-reload-at';
const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;
const CONTROLLER_RELOAD_COOLDOWN_MS = 30_000;
const WEB_SERVICE_WORKER_REGISTRATION_DELAY_MS = 4_000;
const DESKTOP_ROUTE_PRELOAD_DELAY_MS = 1_800;
const MOBILE_ROUTE_PRELOAD_DELAY_MS = 5_000;

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
};

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function getConnectionInfo(): NetworkInformationLike | undefined {
  const nav = navigator as NavigatorWithConnection;
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
}

function shouldSkipRoutePreload() {
  const connection = getConnectionInfo();
  if (!connection) return false;

  return (
    connection.saveData === true ||
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g' ||
    (typeof connection.downlink === 'number' && connection.downlink < 1.5)
  );
}

function getRoutePreloadDelay() {
  const isLikelyMobile = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return isLikelyMobile ? MOBILE_ROUTE_PRELOAD_DELAY_MS : DESKTOP_ROUTE_PRELOAD_DELAY_MS;
}

function ServiceWorkerUpdater() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let intervalId: number | undefined;
    let removeVisibilityListener: (() => void) | undefined;
    const hadControllerAtMount = Boolean(navigator.serviceWorker.controller);

    const handleControllerChange = () => {
      // A first-time browser visit has no controller. Reloading when the newly
      // installed worker claims that page interrupts the initial app load.
      if (!hadControllerAtMount) return;

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

    const checkForUpdate = (registration: ServiceWorkerRegistration) => {
      if (document.visibilityState !== 'visible') return;
      registration.update().catch(() => {
        // Update checks are best-effort; failed SW fetches should not surface to users/Sentry.
      });
    };

    const registerServiceWorker = () => {
      try {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            const handleVisibilityChange = () => checkForUpdate(registration);

            // register() already performs the initial update check.
            intervalId = window.setInterval(
              () => checkForUpdate(registration),
              UPDATE_CHECK_INTERVAL_MS
            );
            document.addEventListener('visibilitychange', handleVisibilityChange);
            removeVisibilityListener = () => {
              document.removeEventListener('visibilitychange', handleVisibilityChange);
            };
          })
          .catch(() => {
            // SW registration can fail on some iOS browsers; the app can still run online.
          });
      } catch {
        // Some browser contexts throw synchronously for service worker registration.
      }
    };

    // Installed PWAs should check immediately. In a normal browser, let the
    // visible page finish loading before precaching the offline app shell.
    const registrationTimerId = window.setTimeout(
      registerServiceWorker,
      isStandaloneLaunch() ? 0 : WEB_SERVICE_WORKER_REGISTRATION_DELAY_MS
    );

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      window.clearTimeout(registrationTimerId);
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
    if (shouldSkipRoutePreload()) return;

    let idleCallbackId: number | undefined;

    const timerId = window.setTimeout(() => {
      const preloadRoutes = () => {
        if (document.visibilityState !== 'visible') return;

        if (user) preloadAuthenticatedRoutes();
      };

      const win = window as WindowWithIdleCallback;
      if (win.requestIdleCallback) {
        idleCallbackId = win.requestIdleCallback(preloadRoutes, { timeout: 3_000 });
      } else {
        preloadRoutes();
      }
    }, getRoutePreloadDelay());

    return () => {
      window.clearTimeout(timerId);
      if (idleCallbackId !== undefined) {
        (window as WindowWithIdleCallback).cancelIdleCallback?.(idleCallbackId);
      }
    };
  }, [loading, user]);

  return null;
}

function LaunchRouteNormalizer() {
  const { loading, user } = useAuth();
  const initialLocationRef = useRef(router.state.location);
  const hasCheckedLaunchRef = useRef(false);

  useEffect(() => {
    if (loading || hasCheckedLaunchRef.current) return;
    hasCheckedLaunchRef.current = true;

    const initialLocation = initialLocationRef.current;
    const currentLocation = router.state.location;
    const isStillOnInitialRoute =
      currentLocation.pathname === initialLocation.pathname &&
      currentLocation.search === initialLocation.search &&
      currentLocation.hash === initialLocation.hash;

    if (!isStillOnInitialRoute) return;

    const redirect = getLaunchRedirect({
      isStandalone: isStandaloneLaunch(),
      pathname: initialLocation.pathname,
      search: initialLocation.search,
      signedIn: Boolean(user),
    });

    if (redirect && redirect !== `${currentLocation.pathname}${currentLocation.search}`) {
      void router.navigate(redirect, { replace: true });
    }
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
              <LaunchRouteNormalizer />
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
