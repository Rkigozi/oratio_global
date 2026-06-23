import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from './hooks/auth-context';
import { ThemeProvider } from './hooks/theme-context';
import { ErrorBoundary } from "./components/error-boundary";
import { useEffect } from "react";

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

function ServiceWorkerUpdater() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        const checkForUpdate = () => {
          if (document.visibilityState === "visible") void registration.update();
        };
        setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
        document.addEventListener("visibilitychange", checkForUpdate);
      }).catch(() => {
        // SW registration can fail on some iOS browsers — not critical
      });
    }
  }, []);

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
