import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { ActivityUpdatesProvider, useActivityUpdates } from './activity-updates-context';

vi.mock('./auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../services/supabase-queries', () => ({
  getUnreadActivityCount: vi.fn(),
}));

vi.mock('../services/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn().mockResolvedValue('ok'),
  },
}));

import { useAuth } from './auth-context';
import { getUnreadActivityCount } from '../services/supabase-queries';

function mockAuth(user: { id: string } | null) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    profile: null,
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    needsEmailVerification: false,
  });
}

let lastRendered: {
  unreadCount: number;
  liveVersion: number;
  refreshUnreadCount: () => Promise<number>;
} | null = null;

function Probe() {
  const value = useActivityUpdates();
  lastRendered = value;
  return null;
}

function renderProvider() {
  render(
    <ActivityUpdatesProvider>
      <Probe />
    </ActivityUpdatesProvider>
  );
}

describe('ActivityUpdatesProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastRendered = null;
  });

  it('stays at zero without a signed-in user', async () => {
    mockAuth(null);
    renderProvider();

    await waitFor(() => {
      expect(lastRendered?.unreadCount).toBe(0);
    });
    expect(getUnreadActivityCount).not.toHaveBeenCalled();
  });

  it('loads the unread count for a signed-in user', async () => {
    mockAuth({ id: 'user-1' });
    vi.mocked(getUnreadActivityCount).mockResolvedValue(4);
    renderProvider();

    await waitFor(() => {
      expect(lastRendered?.unreadCount).toBe(4);
    });
  });

  it('bumps liveVersion when the count changes', async () => {
    mockAuth({ id: 'user-1' });
    vi.mocked(getUnreadActivityCount).mockResolvedValue(2);
    renderProvider();

    await waitFor(() => {
      expect(lastRendered?.unreadCount).toBe(2);
    });
    expect(lastRendered?.liveVersion).toBe(1);
  });

  it('refreshes when an activity update event is dispatched', async () => {
    mockAuth({ id: 'user-1' });
    vi.mocked(getUnreadActivityCount).mockResolvedValue(5);
    renderProvider();

    await waitFor(() => {
      expect(lastRendered?.unreadCount).toBe(5);
    });

    vi.mocked(getUnreadActivityCount).mockResolvedValue(6);
    await act(async () => {
      window.dispatchEvent(new Event('oratio-activity-updated'));
    });

    await waitFor(() => {
      expect(lastRendered?.unreadCount).toBe(6);
    });
  });

  it('survives a failing unread-count query', async () => {
    mockAuth({ id: 'user-1' });
    vi.mocked(getUnreadActivityCount).mockRejectedValue(new Error('network'));
    renderProvider();

    await waitFor(() => {
      expect(lastRendered?.liveVersion).toBe(0);
    });
    expect(lastRendered?.unreadCount).toBe(0);
  });

  it('exposes refreshUnreadCount for manual refreshes', async () => {
    mockAuth({ id: 'user-1' });
    vi.mocked(getUnreadActivityCount).mockResolvedValue(3);
    renderProvider();

    await waitFor(() => {
      expect(lastRendered?.unreadCount).toBe(3);
    });

    let refreshed: number | undefined;
    await act(async () => {
      refreshed = await lastRendered!.refreshUnreadCount();
    });

    expect(refreshed).toBe(3);
  });

  it('returns zero immediately when refreshing without a user', async () => {
    mockAuth(null);
    renderProvider();

    await waitFor(() => {
      expect(lastRendered).not.toBeNull();
    });

    let refreshed: number | undefined;
    await act(async () => {
      refreshed = await lastRendered!.refreshUnreadCount();
    });

    expect(refreshed).toBe(0);
  });
});
