import { act, renderHook, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';
import { fetchServiceNotice, type ServiceNotice } from '@oratio/shared/service-notice';
import { useServiceNotice } from './use-service-notice';

jest.mock('@oratio/shared/service-notice', () => ({
  ...jest.requireActual<typeof import('@oratio/shared/service-notice')>(
    '@oratio/shared/service-notice'
  ),
  fetchServiceNotice: jest.fn(),
}));
const url = 'https://notice.example/current';
const cacheKey = `oratio:service-notice:${url}`;
function notice(): ServiceNotice {
  return {
    id: 'd6449951-06f2-4cbd-a1ef-b49963f1828c',
    title: 'Maintenance',
    message: 'A short interruption.',
    startsAt: new Date(Date.now() - 1000).toISOString(),
    endsAt: new Date(Date.now() + 3600_000).toISOString(),
  };
}
const fetchNotice = jest.mocked(fetchServiceNotice);
let foreground: (state: AppStateStatus) => void;
let remove: jest.Mock;
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  AppState.currentState = 'active';
  remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    foreground = callback;
    return { remove };
  });
  fetchNotice.mockResolvedValue(notice());
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('loads before authentication, dismisses the current revision and shows a new revision', async () => {
  const { result } = renderHook(() => useServiceNotice(url));
  await waitFor(() => expect(result.current.notice?.title).toBe('Maintenance'));
  act(() => result.current.dismiss());
  expect(result.current.notice).toBeNull();
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(`${cacheKey}:dismissed`, notice().id);
  fetchNotice.mockResolvedValue({ ...notice(), id: '6a1732e2-a41c-4371-8e78-1b40a8bc40aa' });
  await act(async () => foreground('active'));
  await waitFor(() =>
    expect(result.current.notice?.id).toBe('6a1732e2-a41c-4371-8e78-1b40a8bc40aa')
  );
});
it('uses the configured preview endpoint without reading the production cache', async () => {
  const previousUrl = process.env.EXPO_PUBLIC_SERVICE_NOTICE_URL;
  process.env.EXPO_PUBLIC_SERVICE_NOTICE_URL = url;
  try {
    const { unmount } = renderHook(() => useServiceNotice());
    await waitFor(() => expect(fetchNotice).toHaveBeenCalledWith(url, expect.any(AbortSignal)));
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(cacheKey);
    unmount();
  } finally {
    if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_SERVICE_NOTICE_URL;
    else process.env.EXPO_PUBLIC_SERVICE_NOTICE_URL = previousUrl;
  }
});
it('keeps an unexpired cached notice on network failure but clears it on a successful withdrawal', async () => {
  await AsyncStorage.setItem(cacheKey, JSON.stringify({ notice: notice() }));
  fetchNotice.mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useServiceNotice(url));
  await waitFor(() => expect(result.current.notice?.title).toBe('Maintenance'));
  fetchNotice.mockResolvedValue(null);
  await act(async () => foreground('active'));
  await waitFor(() => expect(result.current.notice).toBeNull());
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(cacheKey, JSON.stringify({ notice: null }));
});
it('retains structured maintenance times in the offline cache independently of display start', async () => {
  const cached = {
    ...notice(),
    maintenance: {
      startsAt: new Date(Date.now() + 600_000).toISOString(),
      endsAt: new Date(Date.now() + 1200_000).toISOString(),
    },
  };
  await AsyncStorage.setItem(cacheKey, JSON.stringify({ notice: cached }));
  fetchNotice.mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useServiceNotice(url));
  await waitFor(() => expect(result.current.notice?.maintenance).toEqual(cached.maintenance));
  expect(result.current.notice?.startsAt).toBe(cached.startsAt);
});
it('does not show corrupt or expired cached data', async () => {
  await AsyncStorage.setItem(cacheKey, 'broken JSON');
  fetchNotice.mockRejectedValue(new Error('offline'));
  const { result, unmount } = renderHook(() => useServiceNotice(url));
  await act(async () => undefined);
  expect(result.current.notice).toBeNull();
  unmount();
  await AsyncStorage.setItem(
    cacheKey,
    JSON.stringify({
      notice: {
        ...notice(),
        startsAt: '2020-01-01T00:00:00.000Z',
        endsAt: '2020-01-02T00:00:00.000Z',
      },
    })
  );
  const next = renderHook(() => useServiceNotice(url));
  await act(async () => undefined);
  expect(next.result.current.notice).toBeNull();
});
it('honours dismissal on a fresh mount', async () => {
  await AsyncStorage.setItem(`${cacheKey}:dismissed`, notice().id);
  const { result } = renderHook(() => useServiceNotice(url));
  await act(async () => undefined);
  expect(result.current.notice).toBeNull();
});
it('starts and expires a scheduled notice locally, even while offline', async () => {
  jest.useFakeTimers();
  const start = Date.now() + 10_000;
  const end = start + 10_000;
  fetchNotice.mockResolvedValue({
    ...notice(),
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(end).toISOString(),
  });
  const { result } = renderHook(() => useServiceNotice(url));
  await act(async () => undefined);
  expect(result.current.notice).toBeNull();
  fetchNotice.mockRejectedValue(new Error('offline'));
  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });
  expect(result.current.notice?.title).toBe('Maintenance');
  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });
  expect(result.current.notice).toBeNull();
});
it('does not poll in the background and removes listeners on unmount', async () => {
  jest.useFakeTimers();
  AppState.currentState = 'background';
  const { unmount } = renderHook(() => useServiceNotice(url));
  await act(async () => {
    jest.advanceTimersByTime(120_000);
  });
  expect(fetchNotice).not.toHaveBeenCalled();
  AppState.currentState = 'active';
  await act(async () => foreground('active'));
  expect(fetchNotice).toHaveBeenCalledTimes(1);
  unmount();
  expect(remove).toHaveBeenCalled();
});
