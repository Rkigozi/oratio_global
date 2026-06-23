type PostHogClient = typeof import("posthog-js").default;

let posthogImport: Promise<PostHogClient | null> | null = null;
let posthogInit: Promise<PostHogClient | null> | null = null;
let initialized = false;

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
        api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
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

export function initAnalytics() {
  void startPostHog();
}

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  void startPostHog()
    .then((posthog) => posthog?.capture(event, properties))
    .catch(() => {});
}
