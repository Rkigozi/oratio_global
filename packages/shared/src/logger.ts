// Platform-agnostic error logging. The web app plugs its Sentry sink in via
// setExceptionSink(); the mobile app uses the console-only default for now.

type ExceptionSink = (exception: Error, context: string, extra: Record<string, unknown>) => void;

let exceptionSink: ExceptionSink | null = null;

export function setExceptionSink(fn: ExceptionSink) {
  exceptionSink = fn;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getStringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function normalizeError(
  context: string,
  error: unknown
): { exception: Error; message: string; extra: Record<string, unknown> } {
  if (error instanceof Error) {
    return { exception: error, message: error.message, extra: {} };
  }

  if (isRecord(error)) {
    const message =
      getStringField(error, 'message') ||
      getStringField(error, 'error_description') ||
      getStringField(error, 'error') ||
      stringify(error);

    return {
      exception: new Error(`${context}: ${message}`),
      message,
      extra: { originalError: error },
    };
  }

  const message = typeof error === 'string' ? error : String(error);
  return {
    exception: new Error(`${context}: ${message}`),
    message,
    extra: { originalError: error },
  };
}

export function logError(context: string, error: unknown, extra?: Record<string, unknown>) {
  const normalized = normalizeError(context, error);

  exceptionSink?.(normalized.exception, context, { ...normalized.extra, ...extra });

  console.error(`[${context}]`, normalized.message, extra ?? '');
}
