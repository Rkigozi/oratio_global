export const REQUEST_TIMEOUT_MS = 18_000;

export class RequestTimeoutError extends Error {
  constructor() {
    super('The request timed out. Check your connection and try again.');
    this.name = 'RequestTimeoutError';
  }
}

export function withRequestTimeout<T>(
  operation: PromiseLike<T>,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new RequestTimeoutError()), timeoutMs);
    Promise.resolve(operation).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export function createTimeoutFetch(
  fetchImpl: typeof fetch,
  timeoutMs = REQUEST_TIMEOUT_MS
): typeof fetch {
  return (input, init) => {
    const controller = new AbortController();
    const signal =
      init?.signal ??
      (typeof Request !== 'undefined' && input instanceof Request ? input.signal : undefined);
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
      };
      const timer = setTimeout(() => {
        controller.abort();
        cleanup();
        reject(new RequestTimeoutError());
      }, timeoutMs);
      Promise.resolve()
        .then(() => fetchImpl(input, { ...init, signal: controller.signal }))
        .then(
          (response) => {
            cleanup();
            resolve(response);
          },
          (error) => {
            cleanup();
            reject(error);
          }
        );
    });
  };
}
