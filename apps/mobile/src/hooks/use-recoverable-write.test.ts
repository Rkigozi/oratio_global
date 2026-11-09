import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { WriteOutcomeError, type WriteAttempt } from '@oratio/shared/write-outcome';
import { useRecoverableWrite } from './use-recoverable-write';
import { REQUEST_TIMEOUT_MS } from '../services/request-timeout';

let mockNextId = 0;
jest.mock('../services/submission-id', () => ({
  createSubmissionId: () => `72000000-0000-4000-8000-${String(++mockNextId).padStart(12, '0')}`,
}));
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  mockNextId = 0;
});
afterEach(() => {
  jest.useRealTimers();
});

describe('recoverable native writes', () => {
  it('locks synchronously so rapid taps dispatch only one operation', async () => {
    const waiting = deferred<string>();
    const perform = jest
      .fn<(body: string, attempt: WriteAttempt) => Promise<string>>()
      .mockReturnValue(waiting.promise);
    const { result } = renderHook(() => useRecoverableWrite('thread', 'owner', perform));
    let first!: ReturnType<typeof result.current.run>;
    await act(async () => {
      first = result.current.run('first draft');
      expect(await result.current.run('second draft')).toEqual({ status: 'ignored' });
    });
    expect(perform).toHaveBeenCalledTimes(1);
    expect(result.current.locked).toBe(true);
    await act(async () => {
      waiting.resolve('saved');
      await first;
    });
    expect(result.current.locked).toBe(false);
  });

  it('retains the original intent and ID after lost confirmation, including failed verification', async () => {
    const perform = jest
      .fn<(body: string, attempt: WriteAttempt) => Promise<string>>()
      .mockRejectedValueOnce(new Error('lost confirmation'))
      .mockRejectedValueOnce(new WriteOutcomeError(false))
      .mockResolvedValueOnce('saved');
    const { result } = renderHook(() => useRecoverableWrite('thread', 'owner', perform));
    await act(async () => {
      expect(await result.current.run('original')).toEqual({ status: 'uncertain' });
    });
    await act(async () => {
      expect(await result.current.run('replacement')).toEqual({ status: 'ignored' });
    });
    await act(async () => {
      expect(await result.current.retry()).toEqual({ status: 'uncertain' });
    });
    expect(result.current.uncertain).toBe(true);
    await act(async () => {
      expect(await result.current.retry()).toEqual({ status: 'saved', value: 'saved' });
    });
    expect(
      perform.mock.calls.map(([body, options]) => [body, options.requestId, options.verifyExisting])
    ).toEqual([
      ['original', '72000000-0000-4000-8000-000000000001', false],
      ['original', '72000000-0000-4000-8000-000000000001', true],
      ['original', '72000000-0000-4000-8000-000000000001', true],
    ]);
    expect(result.current.uncertain).toBe(false);
  });

  it('allows an edited new attempt only after an explicit first-attempt rejection', async () => {
    const perform = jest
      .fn<(body: string, attempt: WriteAttempt) => Promise<string>>()
      .mockRejectedValueOnce(new WriteOutcomeError(false))
      .mockResolvedValueOnce('saved');
    const { result } = renderHook(() => useRecoverableWrite('thread', 'owner', perform));
    await act(async () => {
      expect(await result.current.run('rejected')).toEqual({ status: 'failed' });
    });
    expect(result.current.locked).toBe(false);
    await act(async () => {
      await result.current.run('revised');
    });
    expect(perform.mock.calls[1][1].requestId).not.toBe(perform.mock.calls[0][1].requestId);
  });

  it('bounds a stalled operation, aborts its signal and ignores its late success', async () => {
    jest.useFakeTimers();
    const waiting = deferred<string>();
    const perform = jest
      .fn<(body: string, attempt: WriteAttempt) => Promise<string>>()
      .mockReturnValue(waiting.promise);
    const { result } = renderHook(() => useRecoverableWrite('thread', 'owner', perform));
    let request!: ReturnType<typeof result.current.run>;
    act(() => {
      request = result.current.run('draft');
    });
    await act(async () => {
      jest.advanceTimersByTime(REQUEST_TIMEOUT_MS);
      await request;
    });
    expect(result.current.uncertain).toBe(true);
    expect(result.current.busy).toBe(false);
    expect(perform.mock.calls[0][1].signal?.aborted).toBe(true);
    await act(async () => {
      waiting.resolve('late');
    });
    expect(result.current.uncertain).toBe(true);
    expect(perform).toHaveBeenCalledTimes(1);
  });

  it('cancels old-account work and cannot clear a newer account operation', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const perform = jest
      .fn<(body: string, attempt: WriteAttempt) => Promise<string>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(
      ({ actor }: { actor: string }) => useRecoverableWrite('thread', actor, perform),
      { initialProps: { actor: 'A' } }
    );
    let old!: ReturnType<typeof result.current.run>;
    act(() => {
      old = result.current.run('A draft');
    });
    rerender({ actor: 'B' });
    expect(perform.mock.calls[0][1].signal?.aborted).toBe(true);
    let current!: ReturnType<typeof result.current.run>;
    act(() => {
      current = result.current.run('B draft');
    });
    await act(async () => {
      first.resolve('A saved');
      expect(await old).toEqual({ status: 'ignored' });
    });
    expect(result.current.busy).toBe(true);
    await act(async () => {
      second.resolve('B saved');
      await current;
    });
    expect(perform.mock.calls[1][1].expectedUserId).toBe('B');
    expect(result.current.busy).toBe(false);
  });

  it('drops an uncertain intent when its account or target changes', async () => {
    const perform = jest
      .fn<(body: string, attempt: WriteAttempt) => Promise<string>>()
      .mockRejectedValue(new Error('offline'));
    const { result, rerender } = renderHook(
      ({ scope }: { scope: string }) => useRecoverableWrite(scope, 'owner', perform),
      { initialProps: { scope: 'first' } }
    );
    await act(async () => {
      await result.current.run('first target');
    });
    expect(result.current.uncertain).toBe(true);
    rerender({ scope: 'second' });
    await act(async () => {
      expect(await result.current.retry()).toEqual({ status: 'ignored' });
    });
    expect(result.current.locked).toBe(false);
    expect(perform).toHaveBeenCalledTimes(1);
  });

  it('aborts on unmount and never publishes a late result', async () => {
    const waiting = deferred<string>();
    const perform = jest
      .fn<(body: string, attempt: WriteAttempt) => Promise<string>>()
      .mockReturnValue(waiting.promise);
    const { result, unmount } = renderHook(() => useRecoverableWrite('thread', 'owner', perform));
    let request!: ReturnType<typeof result.current.run>;
    act(() => {
      request = result.current.run('draft');
    });
    unmount();
    expect(perform.mock.calls[0][1].signal?.aborted).toBe(true);
    waiting.resolve('late');
    expect(await request).toEqual({ status: 'ignored' });
  });
});
