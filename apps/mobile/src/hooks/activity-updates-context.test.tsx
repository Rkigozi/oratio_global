import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ActivityUpdatesProvider, useActivityUpdates } from './activity-updates-context';

jest.mock('./auth-context', () => ({ useAuth: jest.fn() }));

jest.mock('@oratio/shared/queries', () => ({
  getUnreadActivityCount: jest.fn(),
  subscribeToActivityEventChanges: jest.fn(),
}));

import { useAuth } from './auth-context';
import { getUnreadActivityCount, subscribeToActivityEventChanges } from '@oratio/shared/queries';

describe('ActivityUpdatesProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
    } as never);
    jest.mocked(getUnreadActivityCount).mockResolvedValue(3 as never);
    jest.mocked(subscribeToActivityEventChanges).mockReturnValue(jest.fn());
  });

  it('loads unread activity and subscribes for the signed-in user', async () => {
    const { result } = renderHook(() => useActivityUpdates(), {
      wrapper: ActivityUpdatesProvider,
    });

    await waitFor(() => expect(result.current.unreadCount).toBe(3));
    expect(subscribeToActivityEventChanges).toHaveBeenCalledWith('user-1', expect.any(Function));
  });

  it('refreshes the badge and live version after a realtime change', async () => {
    let onChange: (() => void) | undefined;
    jest
      .mocked(getUnreadActivityCount)
      .mockResolvedValueOnce(1 as never)
      .mockResolvedValueOnce(2 as never);
    jest.mocked(subscribeToActivityEventChanges).mockImplementation((_userId, callback) => {
      onChange = callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useActivityUpdates(), {
      wrapper: ActivityUpdatesProvider,
    });

    await waitFor(() => expect(result.current.unreadCount).toBe(1));
    const initialVersion = result.current.liveVersion;
    act(() => onChange?.());

    await waitFor(() => expect(result.current.unreadCount).toBe(2));
    expect(result.current.liveVersion).toBeGreaterThan(initialVersion);
  });

  it('does not query or subscribe while signed out', async () => {
    jest.mocked(useAuth).mockReturnValue({ user: null, loading: false } as never);

    const { result } = renderHook(() => useActivityUpdates(), {
      wrapper: ActivityUpdatesProvider,
    });

    await waitFor(() => expect(result.current.unreadCount).toBe(0));
    expect(getUnreadActivityCount).not.toHaveBeenCalled();
    expect(subscribeToActivityEventChanges).not.toHaveBeenCalled();
  });
});
