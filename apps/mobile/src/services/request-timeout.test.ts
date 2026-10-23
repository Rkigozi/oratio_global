import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  createTimeoutFetch,
  RequestTimeoutError,
  REQUEST_TIMEOUT_MS,
  withRequestTimeout,
} from './request-timeout';

describe('bounded mobile requests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('bounds a stalled logical operation below the 20-second recovery target', async () => {
    const result = withRequestTimeout(new Promise<never>(() => {}));
    const check = expect(result).rejects.toBeInstanceOf(RequestTimeoutError);
    await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await check;
    expect(REQUEST_TIMEOUT_MS).toBeLessThan(20_000);
  });

  it('does not replace a timeout with a late success', async () => {
    let finish!: (value: string) => void;
    const result = withRequestTimeout(
      new Promise<string>((resolve) => {
        finish = resolve;
      })
    );
    const check = expect(result).rejects.toBeInstanceOf(RequestTimeoutError);
    await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    finish('late');
    await check;
  });

  it('clears timers on success and propagates real failure', async () => {
    await expect(withRequestTimeout(Promise.resolve('ok'))).resolves.toBe('ok');
    const error = new Error('network');
    await expect(withRequestTimeout(Promise.reject(error))).rejects.toBe(error);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('aborts fetch and settles even if the platform ignores cancellation', async () => {
    const transport = jest.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
    const result = createTimeoutFetch(transport)('https://example.invalid');
    const check = expect(result).rejects.toBeInstanceOf(RequestTimeoutError);
    await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await check;
    expect(transport.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('preserves the request while composing caller cancellation and removes listeners', async () => {
    const caller = new AbortController();
    const remove = jest.spyOn(caller.signal, 'removeEventListener');
    let finish!: (value: Response) => void;
    const transport = jest.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: caller.signal,
    };
    const result = createTimeoutFetch(transport)('https://example.invalid', init);
    await Promise.resolve();
    caller.abort();
    expect(transport.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      headers: init.headers,
      body: '{}',
    });
    expect(transport.mock.calls[0][1]?.signal?.aborted).toBe(true);
    finish({ ok: true } as Response);
    await result;
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(jest.getTimerCount()).toBe(0);
  });
});
