import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { getFeedPrayers } from '@oratio/shared/queries';
import type { PrayerRequest } from '@oratio/shared/prayer-data';
import { useFeed } from './use-feed';

jest.mock('@oratio/shared/queries', () => ({ getFeedPrayers: jest.fn() }));
beforeEach(() => {
  jest.mocked(getFeedPrayers).mockReset();
});
afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('useFeed recovery', () => {
  const page = Array.from(
    { length: 20 },
    (_, n) => ({ id: `prayer-${n}`, createdAt: '2026-10-21T12:00:00Z' }) as PrayerRequest
  );

  it('times out a stalled first load with a retryable error', async () => {
    jest.useFakeTimers();
    jest.mocked(getFeedPrayers).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useFeed());
    let done!: Promise<void>;
    act(() => {
      done = result.current.load();
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(18_000);
      await done;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toMatch(/connection/);
    expect(result.current.hasMore).toBe(false);
  });

  it('preserves rows on a failed refresh and recovers with a new page', async () => {
    jest
      .mocked(getFeedPrayers)
      .mockResolvedValueOnce(page)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([page[1]]);
    const { result } = renderHook(() => useFeed());
    await act(async () => {
      await result.current.load();
    });
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.prayers).toHaveLength(20);
    expect(result.current.error).toBeTruthy();
    expect(result.current.refreshing).toBe(false);
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.prayers).toEqual([page[1]]);
    expect(result.current.error).toBeNull();
  });

  it('guards repeated page requests and preserves the cursor after failure', async () => {
    jest
      .mocked(getFeedPrayers)
      .mockResolvedValueOnce(page)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([{ id: 'last' } as PrayerRequest]);
    const { result } = renderHook(() => useFeed());
    await act(async () => {
      await result.current.load();
    });
    await act(async () => {
      await Promise.all([result.current.loadMore(), result.current.loadMore()]);
    });
    expect(getFeedPrayers).toHaveBeenCalledTimes(2);
    expect(result.current.prayers).toHaveLength(20);
    expect(result.current.pageError).toBeTruthy();
    await act(async () => {
      await result.current.loadMore();
    });
    expect(jest.mocked(getFeedPrayers).mock.calls[1][0]).toBe(
      jest.mocked(getFeedPrayers).mock.calls[2][0]
    );
    expect(result.current.prayers).toHaveLength(21);
    expect(result.current.pageError).toBeNull();
  });

  it('ignores an in-flight page replaced by refresh', async () => {
    let finish!: (value: PrayerRequest[]) => void;
    jest
      .mocked(getFeedPrayers)
      .mockResolvedValueOnce(page)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      )
      .mockResolvedValueOnce([{ id: 'fresh' } as PrayerRequest]);
    const { result } = renderHook(() => useFeed());
    await act(async () => {
      await result.current.load();
    });
    let old!: Promise<void>;
    act(() => {
      old = result.current.loadMore();
    });
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      finish([{ id: 'stale' } as PrayerRequest]);
      await old;
    });
    expect(result.current.prayers.map((prayer) => prayer.id)).toEqual(['fresh']);
  });

  it('does not leak superseded filter results', async () => {
    let finish!: (value: PrayerRequest[]) => void;
    jest
      .mocked(getFeedPrayers)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      )
      .mockResolvedValueOnce([{ id: 'new-filter' } as PrayerRequest]);
    const { result, rerender } = renderHook<ReturnType<typeof useFeed>, { search: string }>(
      ({ search }) => useFeed('public', { search }),
      {
        initialProps: { search: 'old' },
      }
    );
    let old!: Promise<void>;
    act(() => {
      old = result.current.load();
    });
    rerender({ search: 'new' });
    await act(async () => {
      await result.current.load();
    });
    await act(async () => {
      finish([{ id: 'old-filter' } as PrayerRequest]);
      await old;
    });
    expect(result.current.prayers.map((prayer) => prayer.id)).toEqual(['new-filter']);
  });
});

describe('useFeed public expiry', () => {
  it('removes an open public result at expiry, but keeps Circle content', async () => {
    jest.useFakeTimers();
    const deadline = new Date(Date.now() + 1000).toISOString();
    jest.mocked(getFeedPrayers).mockResolvedValue([
      { id: 'public', audience: 'public', expiresAt: deadline },
      { id: 'circle', audience: 'circle', expiresAt: deadline },
    ] as PrayerRequest[]);
    const { result } = renderHook(() => useFeed());
    await act(async () => {
      await result.current.load();
    });
    expect(result.current.prayers).toHaveLength(2);
    act(() => {
      jest.advanceTimersByTime(1001);
    });
    expect(result.current.prayers.map((prayer) => prayer.id)).toEqual(['circle']);
  });
});
