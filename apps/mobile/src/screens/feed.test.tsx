import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { CircleScreen, FeedScreen } from './feed';

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn(),
}));

jest.mock('lucide-react-native', () => ({
  Bell: () => null,
  Bookmark: () => null,
  ChevronDown: () => null,
  Plus: () => null,
  Search: () => null,
  UserRound: () => null,
  UsersRound: () => null,
  X: () => null,
}));

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useNavigation: () => mockNavigation,
    useFocusEffect: (callback: () => void | (() => void)) => {
      useEffect(callback, [callback]);
    },
  };
});

jest.mock('../hooks/auth-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../hooks/activity-updates-context', () => ({
  useActivityUpdates: jest.fn(),
}));

jest.mock('@oratio/shared/queries', () => ({
  getFeedPrayers: jest.fn(),
}));

import { useAuth } from '../hooks/auth-context';
import { useActivityUpdates } from '../hooks/activity-updates-context';
import { getFeedPrayers } from '@oratio/shared/queries';

const prayers = [
  {
    id: 'p1',
    city: 'London',
    country: 'United Kingdom',
    text: 'Please pray for my family',
    username: 'miriam',
    prayerCount: 3,
    lat: 51.5,
    lng: -0.1,
    createdAt: new Date().toISOString(),
    commentsEnabled: true,
  },
  {
    id: 'p2',
    city: 'Lagos',
    country: 'Nigeria',
    text: 'Praying for peace at home',
    username: 'daniel',
    prayerCount: 1,
    lat: 6.5,
    lng: 3.3,
    createdAt: new Date().toISOString(),
    commentsEnabled: true,
  },
];

function mockAuth() {
  jest.mocked(useAuth).mockReturnValue({
    user: { id: 'user-1' },
    profile: { username: 'testuser', display_name: 'Test User' },
    loading: false,
    needsEmailVerification: false,
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
  } as never);
}

const mockNavigation = { navigate: jest.fn() } as never;
describe('FeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth();
    jest.mocked(useActivityUpdates).mockReturnValue({
      unreadCount: 2,
      liveVersion: 0,
      refreshUnreadCount: jest.fn(),
    } as never);
  });

  it('renders prayers from the feed', async () => {
    jest.mocked(getFeedPrayers).mockResolvedValue(prayers as never);

    render(<FeedScreen />);

    await waitFor(() => expect(screen.getByText('Please pray for my family')).toBeTruthy());
    expect(screen.getByText('Praying for peace at home')).toBeTruthy();
  });

  it('shows attribution and location on each card', async () => {
    jest.mocked(getFeedPrayers).mockResolvedValue(prayers as never);

    render(<FeedScreen />);

    await waitFor(() => expect(screen.getByText('miriam')).toBeTruthy());
    expect(screen.getByText('London, United Kingdom')).toBeTruthy();
  });

  it('shows an empty state when there are no prayers', async () => {
    jest.mocked(getFeedPrayers).mockResolvedValue([] as never);

    render(<FeedScreen />);

    await waitFor(() => expect(screen.getByText('No public prayers yet.')).toBeTruthy());
  });

  it('shows a retry option when loading fails', async () => {
    jest.mocked(getFeedPrayers).mockRejectedValue(new Error('network') as never);

    render(<FeedScreen />);

    await waitFor(() => expect(screen.getByText('Retry')).toBeTruthy());
  });

  it('navigates to prayer detail when a card is tapped', async () => {
    jest.mocked(getFeedPrayers).mockResolvedValue(prayers as never);

    render(<FeedScreen />);

    await waitFor(() => expect(screen.getByText('Please pray for my family')).toBeTruthy());

    fireEvent.press(screen.getByText('Please pray for my family'));

    expect((mockNavigation as unknown as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith(
      'PrayerDetail',
      { prayerId: 'p1' }
    );
  });

  it('loads only circle prayers in the Prayer Circle space', async () => {
    jest.mocked(getFeedPrayers).mockResolvedValue([] as never);

    render(<CircleScreen />);

    await waitFor(() => expect(getFeedPrayers).toHaveBeenCalledWith(undefined, 20, 'circle'));
    expect(screen.getByText('No prayers have been shared with your circle yet.')).toBeTruthy();
  });

  it('opens Prayer Circle management from the Circle header', async () => {
    jest.mocked(getFeedPrayers).mockResolvedValue([] as never);

    render(<CircleScreen />);

    fireEvent.press(await screen.findByLabelText('Manage Prayer Circle'));

    expect((mockNavigation as unknown as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith(
      'PrayerCircleManagement'
    );
  });

  it('opens Updates from the badged Public header action', async () => {
    jest.mocked(getFeedPrayers).mockResolvedValue([] as never);

    render(<FeedScreen />);

    fireEvent.press(await screen.findByLabelText('Open updates, 2 unread'));

    expect((mockNavigation as unknown as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith(
      'Updates'
    );
  });

  it('loads saved prayers from the Public filter strip', async () => {
    jest.mocked(getFeedPrayers).mockResolvedValue([] as never);

    render(<FeedScreen />);

    fireEvent.press(await screen.findByLabelText('Show saved prayers'));

    await waitFor(() =>
      expect(getFeedPrayers).toHaveBeenLastCalledWith(undefined, 20, 'public', {
        savedOnly: true,
      })
    );
    expect(screen.getAllByText('Saved').length).toBeGreaterThan(0);
  });

  it('filters public prayers by country', async () => {
    jest.mocked(getFeedPrayers).mockResolvedValue(prayers as never);

    render(<FeedScreen />);

    fireEvent.press(await screen.findByLabelText('Choose prayer country'));
    fireEvent.press(screen.getByText('Nigeria'));

    await waitFor(() =>
      expect(getFeedPrayers).toHaveBeenLastCalledWith(undefined, 20, 'public', {
        country: 'Nigeria',
      })
    );
    expect(screen.getByText('Prayers in Nigeria')).toBeTruthy();
  });

  it('searches public prayers across the full feed', async () => {
    jest.mocked(getFeedPrayers).mockResolvedValue(prayers as never);

    render(<FeedScreen />);

    fireEvent.changeText(await screen.findByLabelText('Search public prayers'), 'peace');

    await waitFor(() =>
      expect(getFeedPrayers).toHaveBeenLastCalledWith(undefined, 20, 'public', {
        search: 'peace',
      })
    );
    expect(screen.getByText('Search: peace')).toBeTruthy();
  });

  it('combines prayer search with the saved filter', async () => {
    jest.mocked(getFeedPrayers).mockResolvedValue([] as never);

    render(<FeedScreen />);

    fireEvent.press(await screen.findByLabelText('Show saved prayers'));
    fireEvent.changeText(screen.getByLabelText('Search public prayers'), 'family');

    await waitFor(() =>
      expect(getFeedPrayers).toHaveBeenLastCalledWith(undefined, 20, 'public', {
        savedOnly: true,
        search: 'family',
      })
    );
    expect(screen.getByText('No saved prayers match "family".')).toBeTruthy();
  });

  it('turns a trending hashtag into a prayer search', async () => {
    jest
      .mocked(getFeedPrayers)
      .mockResolvedValue([{ ...prayers[0], text: 'Please pray for my family #family' }] as never);

    render(<FeedScreen />);

    fireEvent.press(await screen.findByLabelText('Search prayers tagged family'));

    await waitFor(() =>
      expect(getFeedPrayers).toHaveBeenLastCalledWith(undefined, 20, 'public', {
        search: 'family',
      })
    );
    expect(screen.getByDisplayValue('family')).toBeTruthy();
  });

  it('keeps Profile out of the Public header now that it is a tab', async () => {
    jest.mocked(getFeedPrayers).mockResolvedValue([] as never);

    render(<FeedScreen />);

    await screen.findByText('No public prayers yet.');

    expect(screen.queryByLabelText("Open Test User's account menu")).toBeNull();
  });
});
