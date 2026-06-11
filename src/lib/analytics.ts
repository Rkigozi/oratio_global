let posthog: any = null;

export async function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;
  try {
    const { default: PostHog } = await import("posthog-js");
    posthog = PostHog.init(key, {
      api_host: "https://us.i.posthog.com",
      capture_pageview: true,
      loaded: (ph) => {
        if (import.meta.env.DEV) ph.opt_out_capturing();
      },
    });
  } catch {
    // analytics unavailable
  }
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (posthog) {
    posthog.capture(event, properties);
  }
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (posthog) {
    posthog.identify(userId, properties);
  }
}
