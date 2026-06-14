import * as Sentry from "@sentry/react";

export function logError(context: string, error: unknown, extra?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);

  if (import.meta.env.PROD) {
    Sentry.captureException(error instanceof Error ? error : new Error(message), {
      tags: { context },
      extra,
    });
  }

  console.error(`[${context}]`, message);
}
