import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { PrayerDetailScreen } from './prayer-detail';

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  Bookmark: () => null,
  MapPin: () => null,
  MoreHorizontal: () => null,
  Pencil: () => null,
  Share2: () => null,
  Trash2: () => null,
  MessageCircle: () => null,
  Send: () => null,
  X: () => null,
}));

jest.mock('../hooks/auth-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@oratio/shared/queries', () => ({
  getPrayerById: jest.fn(),
  getMyPrayedIds: jest.fn(),
  getMySavedIds: jest.fn(),
  togglePray: jest.fn(),
  toggleSavePrayer: jest.fn(),
  updatePrayerRequest: jest.fn(),
  deletePrayerRequest: jest.fn(),
  getComments: jest.fn(),
  getCommentCount: jest.fn(),
  createComment: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  subscribeToPrayerCommentChanges: jest.fn(),
  toggleCommentsEnabled: jest.fn(),
}));

jest.mock('../services/prayer-sharing', () => ({
  sharePrayer: jest.fn(),
}));

import { useAuth } from '../hooks/auth-context';
import {
  getPrayerById,
  getMyPrayedIds,
  getMySavedIds,
  togglePray,
  toggleSavePrayer,
  updatePrayerRequest,
  deletePrayerRequest,
  getComments,
  getCommentCount,
  subscribeToPrayerCommentChanges,
} from '@oratio/shared/queries';
import { sharePrayer } from '../services/prayer-sharing';

const prayer = {
  id: 'prayer-1',
  city: 'London',
  country: 'United Kingdom',
  text: 'Please pray for my family',
  username: 'miriam',
  prayerCount: 4,
  lat: 51.5,
  lng: -0.1,
  createdAt: new Date().toISOString(),
  commentsEnabled: true,
  audience: 'public',
};

const goBack = jest.fn();
const navigation = { goBack } as never;
const route = { params: { prayerId: 'prayer-1' } } as never;

describe('PrayerDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      profile: { username: 'testuser', display_name: 'Test User' },
    } as never);
    jest.mocked(getPrayerById).mockResolvedValue(prayer as never);
    jest.mocked(getMyPrayedIds).mockResolvedValue([] as never);
    jest.mocked(getMySavedIds).mockResolvedValue([] as never);
    jest.mocked(togglePray).mockResolvedValue(true as never);
    jest.mocked(toggleSavePrayer).mockResolvedValue(true as never);
    jest.mocked(updatePrayerRequest).mockResolvedValue({
      text: 'Updated prayer body',
      editedAt: '2026-09-12T12:00:00.000Z',
    } as never);
    jest.mocked(deletePrayerRequest).mockResolvedValue(true as never);
    jest.mocked(sharePrayer).mockResolvedValue(true as never);
    jest.mocked(getComments).mockResolvedValue([] as never);
    jest.mocked(getCommentCount).mockResolvedValue(0 as never);
    jest.mocked(subscribeToPrayerCommentChanges).mockReturnValue(jest.fn());
  });

  it('renders the prayer text, location, and attribution', async () => {
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByText('Please pray for my family')).toBeTruthy());
    expect(screen.getByText('London, United Kingdom')).toBeTruthy();
    expect(screen.getByText('miriam')).toBeTruthy();
  });

  it('shows the pray button and toggles to prayed state', async () => {
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByText(/Pray for this/)).toBeTruthy());

    fireEvent.press(screen.getByText(/Pray for this/));

    await waitFor(() => expect(screen.getByText(/Prayed for this/)).toBeTruthy());
    expect(togglePray).toHaveBeenCalledWith('prayer-1', true);
  });

  it('starts in the prayed state when the user already prayed', async () => {
    jest.mocked(getMyPrayedIds).mockResolvedValue(['prayer-1'] as never);

    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByText(/Prayed for this/)).toBeTruthy());
    expect(screen.getByText('4 people prayed')).toBeTruthy();
  });

  it('increments the displayed total once after praying', async () => {
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByText('4 people prayed')).toBeTruthy());
    fireEvent.press(screen.getByText(/Pray for this/));

    await waitFor(() => expect(screen.getByText('5 people prayed')).toBeTruthy());
  });

  it('saves and unsaves the prayer from the detail header', async () => {
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('Save prayer'));

    await waitFor(() => expect(toggleSavePrayer).toHaveBeenCalledWith('prayer-1', true));
    fireEvent.press(screen.getByLabelText('Remove saved prayer'));

    await waitFor(() => expect(toggleSavePrayer).toHaveBeenCalledWith('prayer-1', false));
  });

  it('shows an unavailable state when the prayer is missing', async () => {
    jest.mocked(getPrayerById).mockResolvedValue(null as never);

    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    await waitFor(() =>
      expect(screen.getByText('Prayer unavailable. It may have been removed.')).toBeTruthy()
    );
  });

  it('shows sharing but hides owner actions from a non-owner', async () => {
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('More prayer options'));

    expect(screen.getByText('Share prayer')).toBeTruthy();
    expect(screen.queryByText('Edit prayer')).toBeNull();
    expect(screen.queryByText('Delete prayer')).toBeNull();
  });

  it('opens the native share flow with the visible prayer', async () => {
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('More prayer options'));
    fireEvent.press(screen.getByText('Share prayer'));

    await waitFor(() => expect(sharePrayer).toHaveBeenCalledWith(prayer));
  });

  it('lets the owner edit the prayer wording', async () => {
    jest.mocked(getPrayerById).mockResolvedValue({ ...prayer, authorId: 'user-1' } as never);
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('More prayer options'));
    fireEvent.press(screen.getByText('Edit prayer'));
    fireEvent.changeText(
      screen.getByLabelText('Prayer text'),
      'Please pray for renewed hope today'
    );
    fireEvent.press(screen.getByText('Save changes'));

    await waitFor(() =>
      expect(updatePrayerRequest).toHaveBeenCalledWith(
        'prayer-1',
        'Please pray for renewed hope today'
      )
    );
    expect(await screen.findByText('Updated prayer body')).toBeTruthy();
    expect(screen.getByText(/Edited/)).toBeTruthy();
  });

  it('keeps an invalid edit open with guidance', async () => {
    jest.mocked(getPrayerById).mockResolvedValue({ ...prayer, authorId: 'user-1' } as never);
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('More prayer options'));
    fireEvent.press(screen.getByText('Edit prayer'));
    fireEvent.changeText(screen.getByLabelText('Prayer text'), 'Too short');
    fireEvent.press(screen.getByText('Save changes'));

    expect(await screen.findByText('Prayer must be at least 10 characters')).toBeTruthy();
    expect(updatePrayerRequest).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Prayer text')).toBeTruthy();
  });

  it('requires explicit confirmation before deleting an owned prayer', async () => {
    jest.mocked(getPrayerById).mockResolvedValue({ ...prayer, authorId: 'user-1' } as never);
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('More prayer options'));
    fireEvent.press(screen.getByText('Delete prayer'));

    expect(deletePrayerRequest).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Delete prayer?',
      expect.stringContaining('removed permanently'),
      expect.any(Array)
    );

    const buttons = alertSpy.mock.calls[0]?.[2];
    const destructiveAction = buttons?.find((button) => button.style === 'destructive');
    await act(async () => {
      destructiveAction?.onPress?.();
    });

    await waitFor(() => expect(deletePrayerRequest).toHaveBeenCalledWith('prayer-1'));
    expect(goBack).toHaveBeenCalled();
  });

  it('keeps private prayers out of the share flow', async () => {
    jest.mocked(getPrayerById).mockResolvedValue({
      ...prayer,
      audience: 'private',
      authorId: 'user-1',
    } as never);
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('More prayer options'));

    expect(screen.queryByText('Share prayer')).toBeNull();
    expect(screen.getByText('Edit prayer')).toBeTruthy();
    expect(screen.getByText('Delete prayer')).toBeTruthy();
  });
});
