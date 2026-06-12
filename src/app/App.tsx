import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "../lib/auth-context";
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
        background: "rgba(15, 22, 55, 0.98)",
        border: "1px solid rgba(124, 143, 255, 0.15)",
        backdropFilter: "blur(16px)",
      }}
    >
      <p className="text-[#c5cbe2] text-xs flex-1">Update available — reload for the latest version.</p>
      <button
        onClick={() => updateServiceWorker(true)}
        className="px-3 py-1.5 rounded-full text-xs text-white cursor-pointer"
        style={{ background: "linear-gradient(135deg, #7c8fff, #5a6fd6)" }}
      >
        Update
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        className="text-[#4e5573] hover:text-[#6b7499] text-xs transition-colors cursor-pointer"
      >
        Dismiss
      </button>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div style={{
          width: '100%',
          height: '100%',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0A1A3A',
          color: 'white',
        }}>
          <RouterProvider router={router} />
          <UpdatePrompt />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}
