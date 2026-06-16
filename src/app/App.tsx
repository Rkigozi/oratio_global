import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "../lib/auth-context";
import { ThemeProvider } from "../lib/theme-context";
import { ErrorBoundary } from "./components/error-boundary";
import { useRegisterSW } from "virtual:pwa-register/react";

// How often to ask the browser to check for a newer deploy (1 hour).
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

// With registerType: 'autoUpdate', a new deploy is applied and the page
// reloads automatically once detected. The browser only checks for a new
// service worker on navigation by default, so we poll on an interval and
// whenever the tab becomes visible again — the moment that matters most on
// mobile, where the PWA spends most of its life backgrounded.
function ServiceWorkerUpdater() {
  useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const checkForUpdate = () => {
        if (document.visibilityState === "visible") registration.update();
      };

      setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
      document.addEventListener("visibilitychange", checkForUpdate);
    },
  });

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <div style={{
            width: '100%',
            height: '100%',
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--color-bg)',
            color: 'rgb(var(--rgb-text))',
          }}>
            <RouterProvider router={router} />
            <ServiceWorkerUpdater />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
