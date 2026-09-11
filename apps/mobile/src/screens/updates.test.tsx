import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ActivityEvent } from '@oratio/shared/queries';
import { getActivityCopy, UpdatesScreen } from './updates';

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      useEffect(callback, [callback]);
    },
  };
});

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  Bell: () => null,
  Heart: () => null,
  MessageCircle: () => null,
  ShieldCheck: () => null,
  Trash2: () => null,
  UsersRound: () => null,
}));

jest.mock('../hooks/activity-updates-context', () => ({
  useActivityUpdates: jest.fn(),
}));

jest.mock('@oratio/shared/queries', () => ({
  deleteActivityEvent: jest.fn(),
  getActivityEvents: jest.fn(),
  markActivityEventsRead: jest.fn(),
}));

import { useActivityUpdates } from '../hooks/activity-updates-context';
import {
  deleteActivityEvent,
  getActivityEvents,
  markActivityEventsRead,
} from '@oratio/shared/queries';

const refreshUnreadCount = jest.fn<() => Promise<number>>().mockResolvedValue(0);
const now = new Date().toISOString();
const route = {} as never;

function renderUpdates() {
  return render(<UpdatesScreen navigation={mockNavigation as never} route={route} />);
}

const commentEvent: ActivityEvent = {
  id: 'event-1',
  recipient_user_id: 'user-1',
  actor_user_id: 'actor-1',
  event_type: 'comment_on_prayer',
  prayer_id: 'prayer-1',
  comment_id: 'comment-1',
  report_id: null,
  invite_id: null,
  metadata: { comment_preview: 'I am praying with you.' },
  read_at: null,
  created_at: now,
  actor: {
    id: 'actor-1',
    username: 'miriam',
    display_name: 'Miriam',
    avatar_url: null,
  },
};

const circleEvent: ActivityEvent = {
  ...commentEvent,
  id: 'event-2',
  event_type: 'prayer_circle_accepted',
  prayer_id: null,
  comment_id: null,
  invite_id: 'invite-1',
  read_at: now,
};

describe('UpdatesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useActivityUpdates).mockReturnValue({
      unreadCount: 1,
      liveVersion: 0,
      refreshUnreadCount,
    });
    jest.mocked(getActivityEvents).mockResolvedValue([] as never);
    jest.mocked(markActivityEventsRead).mockResolvedValue(true as never);
    jest.mocked(deleteActivityEvent).mockResolvedValue(true as never);
  });

  it('renders activity copy and unread state', async () => {
    jest.mocked(getActivityEvents).mockResolvedValue([commentEvent, circleEvent] as never);

    renderUpdates();

    await waitFor(() => expect(screen.getByText('Miriam commented on your prayer')).toBeTruthy());
    expect(screen.getByText('I am praying with you.')).toBeTruthy();
    expect(screen.getByText('Miriam accepted your Prayer Circle invite')).toBeTruthy();
    expect(screen.getByLabelText('Unread')).toBeTruthy();
  });

  it('opens prayers and Prayer Circle management from relevant updates', async () => {
    jest.mocked(getActivityEvents).mockResolvedValue([commentEvent, circleEvent] as never);

    renderUpdates();

    fireEvent.press(await screen.findByText('Miriam commented on your prayer'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('PrayerDetail', {
      prayerId: 'prayer-1',
    });

    fireEvent.press(screen.getByText('Miriam accepted your Prayer Circle invite'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('PrayerCircleManagement');
  });

  it('groups multiple people praying into calm copy', () => {
    const copy = getActivityCopy({
      ...commentEvent,
      event_type: 'prayer_prayed',
      metadata: { actor_count: 5 },
    });

    expect(copy.title).toBe('Miriam and 4 others prayed with you');
  });

  it('marks unread events read after the inbox is opened', async () => {
    jest.mocked(getActivityEvents).mockResolvedValue([commentEvent] as never);

    renderUpdates();

    await waitFor(() => expect(markActivityEventsRead).toHaveBeenCalledWith(['event-1']), {
      timeout: 2200,
    });
    expect(refreshUnreadCount).toHaveBeenCalled();
  });

  it('deletes an update after confirmation', async () => {
    jest.mocked(getActivityEvents).mockResolvedValue([{ ...commentEvent, read_at: now }] as never);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    renderUpdates();

    const deleteButton = await screen.findByLabelText(
      'Delete update: Miriam commented on your prayer'
    );
    fireEvent.press(deleteButton);
    const buttons = alert.mock.calls[0][2];
    const destructive = buttons?.find((button) => button.style === 'destructive');
    await act(async () => {
      destructive?.onPress?.();
    });

    expect(deleteActivityEvent).toHaveBeenCalledWith('event-1');
    await waitFor(() => expect(screen.queryByText('Miriam commented on your prayer')).toBeNull());
    alert.mockRestore();
  });

  it('shows a quiet empty state', async () => {
    renderUpdates();

    await waitFor(() => expect(screen.getByText('No updates yet')).toBeTruthy());
    expect(
      screen.getByText('Prayer support, comments and Circle activity will appear here.')
    ).toBeTruthy();
  });

  it('returns to the previous screen from the header', async () => {
    renderUpdates();

    fireEvent.press(await screen.findByLabelText('Back'));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });
});
