import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { Updates } from './updates';
import type { ActivityEvent } from '../services/supabase-queries';

vi.mock('../services/supabase-queries', () => ({
  getActivityEvents: vi.fn(),
  markActivityEventsRead: vi.fn(),
}));

import { getActivityEvents, markActivityEventsRead } from '../services/supabase-queries';

const commentUpdate: ActivityEvent = {
  id: 'event-1',
  recipient_user_id: 'user-1',
  actor_user_id: 'actor-1',
  event_type: 'comment_on_prayer',
  prayer_id: 'p1',
  comment_id: 'c1',
  report_id: null,
  invite_id: null,
  metadata: { comment_preview: 'Praying with you today.' },
  read_at: null,
  created_at: new Date().toISOString(),
  actor: {
    id: 'actor-1',
    username: 'miriam',
    display_name: 'Miriam',
    avatar_url: null,
  },
};

describe('Updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.mocked(markActivityEventsRead).mockResolvedValue(true);
  });

  it('renders activity events and navigates to the related prayer', async () => {
    vi.mocked(getActivityEvents).mockResolvedValue([commentUpdate]);

    render(
      <MemoryRouter initialEntries={['/updates']}>
        <Routes>
          <Route path="/updates" element={<Updates />} />
          <Route path="/prayer/:id" element={<div>Prayer detail</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Miriam commented on your prayer')).toBeInTheDocument();
    expect(screen.getByText('Praying with you today.')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('View prayer'));
    });

    expect(screen.getByText('Prayer detail')).toBeInTheDocument();
  });

  it('shows an empty state when there are no updates', async () => {
    vi.mocked(getActivityEvents).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Updates />
      </MemoryRouter>
    );

    expect(await screen.findByText('No updates yet')).toBeInTheDocument();
  });

  it('can mark all unread updates as read', async () => {
    vi.mocked(getActivityEvents).mockResolvedValue([commentUpdate]);

    render(
      <MemoryRouter>
        <Updates />
      </MemoryRouter>
    );

    await screen.findByText('Miriam commented on your prayer');

    await act(async () => {
      fireEvent.click(screen.getByText('Mark all read'));
    });

    expect(markActivityEventsRead).toHaveBeenCalledWith(['event-1']);
  });
});
