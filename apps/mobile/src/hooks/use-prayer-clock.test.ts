import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { isPrayerArchived, type PrayerRequest } from '@oratio/shared/prayer-data';
import { usePrayerClock } from './use-prayer-clock';

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('usePrayerClock', () => {
  it('updates at each deadline without requiring a navigation or refresh', () => {
    jest.useFakeTimers();
    const start = Date.parse('2026-10-18T12:00:00Z');
    jest.setSystemTime(start);
    const prayers = [1000, 2000].map(
      (ms) =>
        ({ audience: 'public', expiresAt: new Date(start + ms).toISOString() }) as PrayerRequest
    );
    const { result, unmount } = renderHook(() => usePrayerClock(prayers));
    expect(prayers.filter((prayer) => !isPrayerArchived(prayer, result.current))).toHaveLength(2);
    act(() => {
      jest.advanceTimersByTime(1001);
    });
    expect(prayers.filter((prayer) => !isPrayerArchived(prayer, result.current))).toHaveLength(1);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(prayers.filter((prayer) => !isPrayerArchived(prayer, result.current))).toHaveLength(0);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
  it('rechecks after resuming when background timers did not run', () => {
    jest.useFakeTimers();
    const start = Date.now();
    let resume: ((state: AppStateStatus) => void) | undefined;
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      resume = listener;
      return { remove };
    });
    const prayer = {
      audience: 'public',
      expiresAt: new Date(start + 1000).toISOString(),
    } as PrayerRequest;
    const { result, unmount } = renderHook(() => usePrayerClock([prayer]));
    act(() => {
      jest.setSystemTime(start + 5000);
      resume?.('active');
    });
    expect(isPrayerArchived(prayer, result.current)).toBe(true);
    unmount();
    expect(remove).toHaveBeenCalled();
  });
});
