import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { initAnalytics } from "./lib/analytics";
import { initMonitoring } from "./lib/monitoring";
import { installModuleScriptRecovery } from "./lib/pwa-recovery";
import "./styles/index.css";

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  };

function runWhenIdle(callback: () => void) {
  const idleWindow = window as IdleWindow;
  if (typeof idleWindow.requestIdleCallback === "function") {
    idleWindow.requestIdleCallback(callback, { timeout: 3000 });
    return;
  }

  globalThis.setTimeout(callback, 1200);
}

installModuleScriptRecovery();

createRoot(document.getElementById("root")!).render(<App />);

runWhenIdle(() => {
  initMonitoring();
  initAnalytics();
});
