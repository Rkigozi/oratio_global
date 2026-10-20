import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { getFeedPrayers } from '@oratio/shared/queries';
import type { PrayerRequest } from '@oratio/shared/prayer-data';
import { useFeed } from './use-feed';

jest.mock('@oratio/shared/queries', () => ({ getFeedPrayers: jest.fn() }));
afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
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
