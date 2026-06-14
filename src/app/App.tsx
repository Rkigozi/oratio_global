import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "../lib/auth-context";
import { ThemeProvider } from "../lib/theme-context";
import { ErrorBoundary } from "./components/error-boundary";
import { useRegisterSW } from "virtual:pwa-register/react";

function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      className="fixed bottom-24 left-4 right-4 z-[1000] max-w-sm mx-auto rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg"
      style={{
        background: "rgba(var(--rgb-surface), 0.98)",
        border: "1px solid rgba(var(--rgb-accent), 0.15)",
        backdropFilter: "blur(16px)",
      }}
    >
      <p className="text-text-secondary text-xs flex-1">Update available — reload for the latest version.</p>
      <button
        onClick={() => updateServiceWorker(true)}
        className="px-3 py-1.5 rounded-full text-xs text-white cursor-pointer"
        style={{ background: "linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))" }}
      >
        Update
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        className="text-text-dim hover:text-text-muted text-xs transition-colors cursor-pointer"
      >
        Dismiss
      </button>
    </div>
  );
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
            <UpdatePrompt />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
