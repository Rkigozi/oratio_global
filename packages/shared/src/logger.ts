// Each app supplies its own optional, privacy-aware exception sink.

type ExceptionSink = (
  exception: Error,
  context: string,
  extra: Record<string, unknown>
) => void | Promise<void>;

let exceptionSink: ExceptionSink | null = null;

export function setExceptionSink(fn: ExceptionSink | null) {
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

  try {
    const result = exceptionSink?.(normalized.exception, context, {
      ...normalized.extra,
      ...extra,
    });
    // Reporting must never change the outcome of the original app operation.
    if (result) void result.catch(() => {});
  } catch {
    // Do not recursively log failures from the logging provider itself.
  }

  console.error(`[${context}]`, normalized.message, extra ?? '');
}
