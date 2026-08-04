type PostHogClient = typeof import("posthog-js").default;

type PendingCapture = {
  event: string;
  properties: Record<string, unknown>;
};

const PASSIVE_TELEMETRY_DELAY_MS = 6_000;

let posthogImport: Promise<PostHogClient | null> | null = null;
let posthogInit: Promise<PostHogClient | null> | null = null;
let passiveTelemetryTimer: number | null = null;
let initialized = false;
let appOpenedCaptured = false;
const pendingCaptures: PendingCapture[] = [];

function loadPostHog() {
  posthogImport ??= import("posthog-js")
    .then((module) => module.default)
    .catch(() => null);
  return posthogImport;
}

function startPostHog() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return Promise.resolve(null);

  posthogInit ??= loadPostHog().then((posthog) => {
    if (!posthog) return null;
    if (!initialized) {
      posthog.init(key, {
        api_host: import.meta.env.VITE_POSTHOG_HOST || "https://eu.i.posthog.com",
        capture_pageview: false,
        defaults: "2026-05-30",
        loaded: (ph) => {
          if (!import.meta.env.PROD) ph.opt_out_capturing();
        },
      });
      initialized = true;
    }
    return posthog;
  });

  return posthogInit;
}

function getRuntimeProperties() {
  if (typeof window === "undefined") return {};

  const iosNavigator = navigator as Navigator & { standalone?: boolean };

  return {
    display_mode:
      window.matchMedia("(display-mode: standalone)").matches || iosNavigator.standalone
        ? "standalone"
        : "browser",
    path: window.location.pathname,
    url: window.location.href,
  };
}

function flushPendingCaptures(posthog: PostHogClient) {
  while (pendingCaptures.length > 0) {
    const capture = pendingCaptures.shift();
    if (capture) posthog.capture(capture.event, capture.properties);
  }
}

function schedulePassiveTelemetry() {
  if (passiveTelemetryTimer !== null) return;
  if (typeof window === "undefined") return;

  passiveTelemetryTimer = window.setTimeout(() => {
    passiveTelemetryTimer = null;
    void startPostHog()
      .then((posthog) => {
        if (posthog) flushPendingCaptures(posthog);
      })
      .catch(() => {});
  }, PASSIVE_TELEMETRY_DELAY_MS);
}

function queuePassiveCapture(event: string, properties: Record<string, unknown>) {
  pendingCaptures.push({ event, properties });
  schedulePassiveTelemetry();
}

function captureImmediately(event: string, properties: Record<string, unknown>) {
  void startPostHog()
    .then((posthog) => {
      if (!posthog) return;
      flushPendingCaptures(posthog);
      posthog.capture(event, properties);
    })
    .catch(() => {});
}

export function initAnalytics() {
  if (appOpenedCaptured) return;
  appOpenedCaptured = true;
  queuePassiveCapture("app_opened", getRuntimeProperties());
}

export function capturePageView(path: string) {
  queuePassiveCapture("$pageview", {
    ...getRuntimeProperties(),
    path,
    $current_url: window.location.href,
  });
}

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  captureImmediately(
    event,
    {
      ...getRuntimeProperties(),
      ...properties,
    }
  );
}
