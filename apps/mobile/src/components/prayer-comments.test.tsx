import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { PrayerRequest } from '@oratio/shared/prayer-data';
import { PrayerComments } from './prayer-comments';

jest.mock('lucide-react-native', () => ({
  MessageCircle: () => null,
  Send: () => null,
  X: () => null,
}));

jest.mock('../hooks/auth-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@oratio/shared/queries', () => ({
  getComments: jest.fn(),
  getCommentCount: jest.fn(),
  createComment: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  subscribeToPrayerCommentChanges: jest.fn(),
  toggleCommentsEnabled: jest.fn(),
}));

import { useAuth } from '../hooks/auth-context';
import {
  createComment,
  deleteComment,
  getCommentCount,
  getComments,
  subscribeToPrayerCommentChanges,
  toggleCommentsEnabled,
  updateComment,
} from '@oratio/shared/queries';

const now = new Date().toISOString();

const publicPrayer: PrayerRequest = {
  id: 'prayer-1',
  authorId: 'author-1',
  audience: 'public',
  city: 'London',
  country: 'United Kingdom',
  text: 'Please pray for peace',
  username: 'miriam',
  prayerCount: 1,
  commentCount: 0,
  commentsEnabled: true,
  lat: 51.5,
  lng: -0.1,
  createdAt: now,
};

const parentComment = {
  id: 'comment-1',
  prayer_id: 'prayer-1',
  user_id: 'author-2',
  parent_id: null,
  body: 'Praying with you.',
  created_at: now,
  updated_at: now,
  user: {
    username: 'jonah',
    display_name: 'Jonah',
    avatar_url: null,
  },
};

const reply = {
  id: 'comment-2',
  prayer_id: 'prayer-1',
  user_id: 'author-3',
  parent_id: 'comment-1',
  body: 'Amen.',
  created_at: now,
  updated_at: now,
  user: {
    username: 'ruth',
    display_name: 'Ruth',
    avatar_url: null,
  },
};

describe('PrayerComments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      profile: { username: 'testuser', display_name: 'Test User' },
    } as never);
    jest.mocked(getComments).mockResolvedValue([] as never);
    jest.mocked(getCommentCount).mockResolvedValue(0 as never);
    jest.mocked(subscribeToPrayerCommentChanges).mockReturnValue(jest.fn());
    jest.mocked(deleteComment).mockResolvedValue(true as never);
    jest.mocked(toggleCommentsEnabled).mockResolvedValue(true as never);
  });

  it('renders public comments and their replies', async () => {
    jest.mocked(getComments).mockResolvedValue([parentComment, reply] as never);
    jest.mocked(getCommentCount).mockResolvedValue(2 as never);

    render(<PrayerComments prayer={publicPrayer} />);

    await waitFor(() => expect(screen.getByText('Praying with you.')).toBeTruthy());
    expect(screen.getByText('Amen.')).toBeTruthy();
    expect(screen.getByText('Comments (2)')).toBeTruthy();
  });

  it('posts a new encouragement', async () => {
    jest.mocked(createComment).mockResolvedValue({
      ...parentComment,
      id: 'comment-new',
      user_id: 'user-1',
      body: 'Standing with you in prayer.',
      user: null,
    } as never);

    render(<PrayerComments prayer={publicPrayer} />);

    await waitFor(() =>
      expect(screen.getByPlaceholderText('Write an encouragement...')).toBeTruthy()
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('Write an encouragement...'),
      'Standing with you in prayer.'
    );
    fireEvent.press(screen.getByLabelText('Post comment'));

    await waitFor(() =>
      expect(createComment).toHaveBeenCalledWith({
        prayer_id: 'prayer-1',
        body: 'Standing with you in prayer.',
        parent_id: undefined,
      })
    );
    expect(screen.getByText('Standing with you in prayer.')).toBeTruthy();
  });

  it('keeps replies one level deep', async () => {
    jest.mocked(getComments).mockResolvedValue([parentComment, reply] as never);
    jest.mocked(getCommentCount).mockResolvedValue(2 as never);
    jest.mocked(createComment).mockResolvedValue({
      ...reply,
      id: 'comment-new',
      user_id: 'user-1',
      body: 'Thank you.',
    } as never);

    render(<PrayerComments prayer={publicPrayer} />);

    await waitFor(() => expect(screen.getByText('Amen.')).toBeTruthy());
    fireEvent.press(screen.getAllByText('Reply')[1]);
    expect(screen.getByText('Replying to @ruth')).toBeTruthy();
    fireEvent.changeText(screen.getByPlaceholderText('Write a reply...'), 'Thank you.');
    fireEvent.press(screen.getByLabelText('Post reply'));

    await waitFor(() =>
      expect(createComment).toHaveBeenCalledWith({
        prayer_id: 'prayer-1',
        body: 'Thank you.',
        parent_id: 'comment-1',
      })
    );
  });

  it('presents private comments as personal notes', async () => {
    const privatePrayer = {
      ...publicPrayer,
      authorId: 'user-1',
      audience: 'private' as const,
      username: 'testuser',
    };
    jest.mocked(createComment).mockResolvedValue({
      ...parentComment,
      id: 'note-1',
      user_id: 'user-1',
      body: 'A thought for later.',
      user: null,
    } as never);

    render(<PrayerComments prayer={privatePrayer} />);

    await waitFor(() => expect(screen.getByText('No notes yet.')).toBeTruthy());
    expect(screen.getByText('Notes (0)')).toBeTruthy();
    expect(screen.queryByText('Reply')).toBeNull();
    fireEvent.changeText(screen.getByPlaceholderText('Add a note...'), 'A thought for later.');
    fireEvent.press(screen.getByLabelText('Save note'));

    await waitFor(() =>
      expect(createComment).toHaveBeenCalledWith({
        prayer_id: 'prayer-1',
        body: 'A thought for later.',
        parent_id: null,
      })
    );
  });

  it('lets the author edit and delete their own comment', async () => {
    const ownComment = { ...parentComment, user_id: 'user-1' };
    jest.mocked(getComments).mockResolvedValue([ownComment] as never);
    jest.mocked(getCommentCount).mockResolvedValue(1 as never);
    jest.mocked(updateComment).mockResolvedValue({
      ...ownComment,
      body: 'Updated encouragement.',
    } as never);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    render(<PrayerComments prayer={publicPrayer} />);

    await waitFor(() => expect(screen.getByText('Praying with you.')).toBeTruthy());
    fireEvent.press(screen.getByText('Edit'));
    fireEvent.changeText(screen.getByDisplayValue('Praying with you.'), 'Updated encouragement.');
    fireEvent.press(screen.getByText('Save'));
    await waitFor(() =>
      expect(updateComment).toHaveBeenCalledWith('comment-1', 'Updated encouragement.')
    );

    fireEvent.press(screen.getByText('Delete'));
    const buttons = alert.mock.calls[0][2];
    const destructive = buttons?.find((button) => button.style === 'destructive');
    await act(async () => {
      destructive?.onPress?.();
    });

    await waitFor(() => expect(deleteComment).toHaveBeenCalledWith('comment-1'));
    alert.mockRestore();
  });

  it('lets a public prayer author change whether comments are available', async () => {
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'author-1' },
      profile: { username: 'miriam', display_name: 'Miriam' },
    } as never);

    render(<PrayerComments prayer={publicPrayer} />);

    await waitFor(() => expect(screen.getByLabelText('Allow comments')).toBeTruthy());
    fireEvent(screen.getByLabelText('Allow comments'), 'valueChange', false);

    await waitFor(() => expect(toggleCommentsEnabled).toHaveBeenCalledWith('prayer-1', false));
    expect(screen.getByText('Comments are off for this prayer.')).toBeTruthy();
  });
});
