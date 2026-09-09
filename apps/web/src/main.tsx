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

const PASSIVE_MONITORING_DELAY_MS = 20_000;

function runWhenIdle(callback: () => void) {
  const idleWindow = window as IdleWindow;
  if (typeof idleWindow.requestIdleCallback === "function") {
    idleWindow.requestIdleCallback(callback, { timeout: 3000 });
    return;
  }

  globalThis.setTimeout(callback, 1200);
}

function runAfterDelayWhenIdle(callback: () => void, delayMs: number) {
  globalThis.setTimeout(() => runWhenIdle(callback), delayMs);
}

installModuleScriptRecovery();

createRoot(document.getElementById("root")!).render(<App />);

runWhenIdle(() => {
  initAnalytics();
});

runAfterDelayWhenIdle(initMonitoring, PASSIVE_MONITORING_DELAY_MS);
