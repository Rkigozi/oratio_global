import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PrayerDetailScreen } from './prayer-detail';

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  Bookmark: () => null,
  MapPin: () => null,
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
  getPrayerById,
  getMyPrayedIds,
  getMySavedIds,
  togglePray,
  toggleSavePrayer,
  getComments,
  getCommentCount,
  subscribeToPrayerCommentChanges,
} from '@oratio/shared/queries';

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

const navigation = { goBack: jest.fn() } as never;
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
});
