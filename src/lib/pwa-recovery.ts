const RECOVERY_KEY = "oratio:module-script-recovery-at";
const RECOVERY_COOLDOWN_MS = 30_000;

const MODULE_SCRIPT_ERROR_PATTERNS = [
  /importing a module script failed/i,
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /module script load failed/i,
  /chunkloaderror/i,
  /loading chunk \d+ failed/i,
  /vite:preloaderror/i,
];

type VitePreloadErrorEvent = Event & {
  payload?: unknown;
};

export function installModuleScriptRecovery() {
  if (typeof window === "undefined") return;

  let pendingModuleScriptError: unknown;

  const attemptRecovery = (error: unknown) => {
    pendingModuleScriptError = error;
    void recoverFromModuleScriptLoadError(error);
  };

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    const preloadEvent = event as VitePreloadErrorEvent;
    attemptRecovery(preloadEvent.payload ?? "vite:preloadError");
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (!isModuleScriptLoadError(event.reason)) return;
    event.preventDefault();
    attemptRecovery(event.reason);
  });

  window.addEventListener("error", (event) => {
    const error: unknown = event.error ?? event.message;
    if (!isModuleScriptLoadError(error)) return;
    event.preventDefault();
    attemptRecovery(error);
  });

  window.addEventListener("online", () => {
    if (!pendingModuleScriptError) return;
    attemptRecovery(pendingModuleScriptError);
  });
}

export function isModuleScriptLoadError(error: unknown) {
  const text = errorText(error);
  return MODULE_SCRIPT_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

export async function recoverFromModuleScriptLoadError(error: unknown) {
  if (!isModuleScriptLoadError(error) || recentlyTriedRecovery()) return false;
  if (shouldWaitForConnectionBeforeRecovery()) return false;

  markRecoveryAttempt();

  await Promise.allSettled([
    unregisterServiceWorkers(),
    clearOriginCaches(),
  ]);

  window.location.reload();
  return true;
}

export function shouldWaitForConnectionBeforeRecovery() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return [error.name, error.message, error.stack].filter(Boolean).join(" ");
  }

  if (typeof error === "string") return error;

  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    return ["name", "message", "reason", "error", "type"]
      .map((key) => record[key])
      .filter((value): value is string => typeof value === "string")
      .join(" ");
  }

  return String(error);
}

function recentlyTriedRecovery() {
  try {
    const lastAttempt = Number(window.sessionStorage.getItem(RECOVERY_KEY) ?? 0);
    return Date.now() - lastAttempt < RECOVERY_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markRecoveryAttempt() {
  try {
    window.sessionStorage.setItem(RECOVERY_KEY, String(Date.now()));
  } catch {
    // If storage is unavailable, still try the reload recovery path.
  }
}

async function unregisterServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

async function clearOriginCaches() {
  if (!("caches" in window)) return;
  const keys = await window.caches.keys();
  await Promise.all(keys.map((key) => window.caches.delete(key)));
}
