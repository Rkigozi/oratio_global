type PostHogClient = typeof import("posthog-js").default;

let posthogImport: Promise<PostHogClient | null> | null = null;
let posthogInit: Promise<PostHogClient | null> | null = null;
let initialized = false;
let appOpenedCaptured = false;

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

export function initAnalytics() {
  void startPostHog()
    .then((posthog) => {
      if (!posthog || appOpenedCaptured) return;
      appOpenedCaptured = true;
      posthog.capture("app_opened", getRuntimeProperties());
    })
    .catch(() => {});
}

export function capturePageView(path: string) {
  void startPostHog()
    .then((posthog) => {
      posthog?.capture("$pageview", {
        ...getRuntimeProperties(),
        path,
        $current_url: window.location.href,
      });
    })
    .catch(() => {});
}

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  void startPostHog()
    .then((posthog) => posthog?.capture(event, {
      ...getRuntimeProperties(),
      ...properties,
    }))
    .catch(() => {});
}
