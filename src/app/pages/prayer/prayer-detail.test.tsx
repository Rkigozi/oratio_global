import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { PrayerDetail } from './prayer-detail';

vi.mock('../../hooks/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../components/comments/comment-section', () => ({
  CommentSection: ({ onCommentCountChange }: { onCommentCountChange: (n: number) => void }) => {
    onCommentCountChange(2);
    return <div>Comments stub</div>;
  },
}));

vi.mock('../../services/supabase-queries', () => ({
  getPrayerById: vi.fn(),
  updatePrayerRequest: vi.fn(),
  togglePray: vi.fn(),
  toggleSavePrayer: vi.fn(),
  getProfileByUsername: vi.fn(),
  getPrayerCircleStatus: vi.fn(),
  sendPrayerCircleInvite: vi.fn(),
  cancelPrayerCircleInvite: vi.fn(),
  respondToPrayerCircleInvite: vi.fn(),
  toggleCommentsEnabled: vi.fn(),
  getMyPrayedIds: vi.fn(),
  getMySavedIds: vi.fn(),
  reportContent: vi.fn(),
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: ComponentProps<'div'> & Record<string, unknown>) => <div {...props}>{children}</div>,
    p: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: ComponentProps<'p'> & Record<string, unknown>) => <p {...props}>{children}</p>,
    button: ({
      children,
      whileTap: _whileTap,
      onClick,
      ...props
    }: ComponentProps<'button'> & Record<string, unknown>) => (
      <button {...props} onClick={onClick as never}>
        {children}
      </button>
    ),
  },
}));

import { useAuth } from '../../hooks/auth-context';
import {
  getPrayerById,
  getMyPrayedIds,
  getMySavedIds,
  getPrayerCircleStatus,
  togglePray,
  toggleSavePrayer,
  toggleCommentsEnabled,
  reportContent,
  getProfileByUsername,
} from '../../services/supabase-queries';
import type { PrayerRequest } from '../../services/prayer-data';

const prayer: PrayerRequest = {
  id: 'prayer-1',
  city: 'London',
  country: 'United Kingdom',
  text: 'Pray for my family',
  username: 'author',
  prayerCount: 4,
  lat: 51.5,
  lng: -0.1,
  createdAt: new Date().toISOString(),
  commentsEnabled: true,
  audience: 'public',
  authorId: 'other-user',
};

function mockAuth(userId: string | null) {
  vi.mocked(useAuth).mockReturnValue({
    user: userId ? { id: userId } : null,
    profile: { username: 'viewer', display_name: 'Viewer' },
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    needsEmailVerification: false,
  });
}

function renderDetail(route = '/prayer/prayer-1') {
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/prayer/:id" element={<PrayerDetail />} />
        <Route path="/feed" element={<div>Feed stub</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PrayerDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth('viewer-user');
    vi.mocked(getPrayerById).mockResolvedValue(prayer);
    vi.mocked(getMyPrayedIds).mockResolvedValue([]);
    vi.mocked(getMySavedIds).mockResolvedValue([]);
    vi.mocked(getPrayerCircleStatus).mockResolvedValue({ state: 'none' });
    vi.mocked(getProfileByUsername).mockResolvedValue({
      id: 'other-user',
      username: 'author',
      display_name: null,
      avatar_url: null,
      created_at: '',
    });
    vi.mocked(togglePray).mockResolvedValue(true);
    vi.mocked(toggleSavePrayer).mockResolvedValue(true);
    vi.mocked(reportContent).mockResolvedValue({ error: null, alreadyReported: false });
  });

  it('renders the prayer text, location, and attribution', async () => {
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Pray for my family')).toBeInTheDocument();
    });
    expect(screen.getByText('London, United Kingdom')).toBeInTheDocument();
    expect(screen.getByText('author')).toBeInTheDocument();
  });

  it('shows the pray button and toggles to prayed state', async () => {
    renderDetail();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pray for this/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /pray for this/i }));
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /prayed for this/i })).toBeInTheDocument();
    });
    expect(togglePray).toHaveBeenCalledWith('prayer-1', true);
  });

  it('shows the people-prayed count', async () => {
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('4 people prayed')).toBeInTheDocument();
    });
  });

  it('renders the comments section and syncs the count', async () => {
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Comments stub')).toBeInTheDocument();
    });
  });

  it('reports a prayer through the report dialog', async () => {
    renderDetail();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /more/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /more/i }));
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Report'));
    });

    await waitFor(() => {
      expect(screen.getByText('Why are you reporting this?')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Spam or fake'));
    });

    await waitFor(() => {
      expect(reportContent).toHaveBeenCalledWith({
        reportable_type: 'prayer',
        reportable_id: 'prayer-1',
        reason: 'Spam or fake',
      });
    });
  });

  it('lets the author toggle comments off', async () => {
    mockAuth('other-user');
    vi.mocked(getPrayerById).mockResolvedValue(prayer);

    renderDetail();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /more/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /more/i }));
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Turn off comments'));
    });

    await waitFor(() => {
      expect(toggleCommentsEnabled).toHaveBeenCalledWith('prayer-1', false);
    });
  });

  it('shows an empty state when the prayer is missing', async () => {
    vi.mocked(getPrayerById).mockResolvedValue(null);
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Prayer unavailable')).toBeInTheDocument();
    });
  });

  it('shows an error state with retry when loading fails', async () => {
    vi.mocked(getPrayerById).mockRejectedValue(new Error('boom'));
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Failed to load prayer')).toBeInTheDocument();
    });
  });
});
