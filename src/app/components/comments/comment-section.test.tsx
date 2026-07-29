import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { CommentSection } from './comment-section';
import type { PrayerRequest } from '../../services/prayer-data';

vi.mock('../../services/supabase-queries', () => ({
  getComments: vi.fn(),
  getCommentCount: vi.fn(),
  createComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  reportContent: vi.fn(),
}));

vi.mock('../../hooks/auth-context', () => ({
  useAuth: vi.fn(),
}));

import {
  getComments,
  getCommentCount,
  createComment,
  updateComment,
  deleteComment,
} from '../../services/supabase-queries';
import { useAuth } from '../../hooks/auth-context';

const mockPrayer: PrayerRequest = {
  id: 'p1',
  city: 'London',
  country: 'UK',
  text: 'Test prayer',
  username: 'author',
  prayerCount: 1,
  lat: 51.5,
  lng: -0.1,
};

describe('CommentSection', () => {
  const defaultAuth = {
    user: { id: 'user-1' },
    profile: { username: 'commenter', display_name: 'Commenter' },
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    needsEmailVerification: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(defaultAuth);
  });

  it('shows loading state initially', () => {
    vi.mocked(getComments).mockReturnValue(new Promise(() => {}));
    vi.mocked(getCommentCount).mockResolvedValue(0);

    render(<CommentSection prayer={mockPrayer} commentCount={0} onCommentCountChange={vi.fn()} />);
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows empty state when no comments', async () => {
    vi.mocked(getComments).mockResolvedValue([]);
    vi.mocked(getCommentCount).mockResolvedValue(0);

    render(<CommentSection prayer={mockPrayer} commentCount={0} onCommentCountChange={vi.fn()} />);

    const text = await screen.findByText(/No comments yet/);
    expect(text).toBeTruthy();
  });

  it('renders comments', async () => {
    vi.mocked(getComments).mockResolvedValue([
      {
        id: 'c1',
        prayer_id: 'p1',
        user_id: 'user-1',
        parent_id: null,
        body: 'Great prayer!',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: {
          username: 'commenter',
          display_name: 'Commenter',
          avatar_url: 'https://cdn.example.com/commenter.jpg',
        },
      },
    ]);
    vi.mocked(getCommentCount).mockResolvedValue(1);

    render(<CommentSection prayer={mockPrayer} commentCount={1} onCommentCountChange={vi.fn()} />);

    const body = await screen.findByText('Great prayer!');
    expect(body).toBeTruthy();
    expect(screen.getByAltText('commenter').getAttribute('src')).toBe(
      'https://cdn.example.com/commenter.jpg'
    );
  });

  it('allows submitting a comment', async () => {
    vi.mocked(getComments).mockResolvedValue([]);
    vi.mocked(getCommentCount).mockResolvedValue(0);
    vi.mocked(createComment).mockResolvedValue({
      id: 'c-new',
      prayer_id: 'p1',
      user_id: 'user-1',
      parent_id: null,
      body: 'New comment',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        username: 'commenter',
        display_name: 'Commenter',
        avatar_url: 'https://cdn.example.com/commenter.jpg',
      },
    });

    render(<CommentSection prayer={mockPrayer} commentCount={0} onCommentCountChange={vi.fn()} />);

    await screen.findByText(/No comments yet/);

    const textarea = screen.getByPlaceholderText('Write an encouragement...');
    fireEvent.change(textarea, { target: { value: 'New comment' } });
    // The send button has no accessible text (just icon). Click it by its role.
    const sendBtn = screen.getAllByRole('button').find((b) => b.querySelector('svg.lucide-send'));
    if (sendBtn) {
      await act(async () => {
        fireEvent.click(sendBtn);
      });
    }
  });

  it('lets prayer authors remove comments from their prayer thread', async () => {
    vi.mocked(useAuth).mockReturnValue({
      ...defaultAuth,
      user: { id: 'author-id' },
      profile: { username: 'author', display_name: 'Author' },
    });
    vi.mocked(getComments).mockResolvedValue([
      {
        id: 'c1',
        prayer_id: 'p1',
        user_id: 'commenter-id',
        parent_id: null,
        body: "Someone else's comment",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: {
          username: 'commenter',
          display_name: 'Commenter',
          avatar_url: null,
        },
      },
      {
        id: 'r1',
        prayer_id: 'p1',
        user_id: 'other-id',
        parent_id: 'c1',
        body: 'Reply under removed comment',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: {
          username: 'other',
          display_name: 'Other',
          avatar_url: null,
        },
      },
    ]);
    vi.mocked(getCommentCount).mockResolvedValue(2);
    vi.mocked(deleteComment).mockResolvedValue(true);
    const onCommentCountChange = vi.fn();

    render(
      <CommentSection
        prayer={{ ...mockPrayer, authorId: 'author-id' }}
        commentCount={2}
        onCommentCountChange={onCommentCountChange}
      />
    );

    await screen.findByText("Someone else's comment");
    expect(screen.getByText('Reply under removed comment')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove comment by commenter' }));
    });

    expect(deleteComment).toHaveBeenCalledWith('c1');
    expect(screen.queryByText("Someone else's comment")).toBeNull();
    expect(screen.queryByText('Reply under removed comment')).toBeNull();
    expect(onCommentCountChange).toHaveBeenLastCalledWith(0);
  });

  it('allows users to edit their own comments', async () => {
    vi.mocked(getComments).mockResolvedValue([
      {
        id: 'c1',
        prayer_id: 'p1',
        user_id: 'user-1',
        parent_id: null,
        body: 'Original encouragement',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        user: {
          username: 'commenter',
          display_name: 'Commenter',
          avatar_url: null,
        },
      },
    ]);
    vi.mocked(getCommentCount).mockResolvedValue(1);
    vi.mocked(updateComment).mockResolvedValue({
      id: 'c1',
      prayer_id: 'p1',
      user_id: 'user-1',
      parent_id: null,
      body: 'Updated encouragement',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:05.000Z',
      user: {
        username: 'commenter',
        display_name: 'Commenter',
        avatar_url: null,
      },
    });

    render(<CommentSection prayer={mockPrayer} commentCount={1} onCommentCountChange={vi.fn()} />);

    await screen.findByText('Original encouragement');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByDisplayValue('Original encouragement'), {
      target: { value: 'Updated encouragement' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(updateComment).toHaveBeenCalledWith('c1', 'Updated encouragement');
    expect(screen.getByText('Updated encouragement')).toBeTruthy();
    expect(screen.getByText('Edited')).toBeTruthy();
  });
});
