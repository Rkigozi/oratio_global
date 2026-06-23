type SentryModule = typeof import("@sentry/react");

let sentryInit: Promise<SentryModule | null> | null = null;

function startSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return Promise.resolve(null);

  sentryInit ??= import("@sentry/react")
    .then((Sentry) => {
      Sentry.init({
        dsn,
        integrations: [Sentry.browserTracingIntegration()],
        tracesSampleRate: 0.1,
        environment: import.meta.env.PROD ? "production" : "development",
      });
      return Sentry;
    })
    .catch(() => null);

  return sentryInit;
}

export function initMonitoring() {
  void startSentry();
}

export function captureException(
  exception: Error,
  context: string,
  extra?: Record<string, unknown>,
) {
  if (!import.meta.env.PROD) return;

  void startSentry()
    .then((Sentry) => {
      Sentry?.captureException(exception, {
        tags: { context },
        extra,
      });
    })
    .catch(() => {});
}
