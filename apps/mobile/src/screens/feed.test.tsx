import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { FeedScreen } from './feed';

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn(),
}));

jest.mock('../hooks/auth-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@oratio/shared/queries', () => ({
  getFeedPrayers: jest.fn(),
}));

import { useAuth } from '../hooks/auth-context';
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

const navigation = { navigate: jest.fn() } as never;
const route = {} as never;

describe('FeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth();
  });

  it('renders prayers from the feed', async () => {
    jest.mocked(getFeedPrayers).mockResolvedValue(prayers as never);

    render(<FeedScreen navigation={navigation as never} route={route} />);

    await waitFor(() => expect(screen.getByText('Please pray for my family')).toBeTruthy());
    expect(screen.getByText('Praying for peace at home')).toBeTruthy();
  });

  it('shows attribution and location on each card', async () => {
    jest.mocked(getFeedPrayers).mockResolvedValue(prayers as never);

    render(<FeedScreen navigation={navigation as never} route={route} />);

    await waitFor(() => expect(screen.getByText('miriam')).toBeTruthy());
    expect(screen.getByText('London, United Kingdom')).toBeTruthy();
  });

  it('shows an empty state when there are no prayers', async () => {
    jest.mocked(getFeedPrayers).mockResolvedValue([] as never);

    render(<FeedScreen navigation={navigation as never} route={route} />);

    await waitFor(() =>
      expect(screen.getByText('No prayers yet. Be the first to share one.')).toBeTruthy()
    );
  });

  it('shows a retry option when loading fails', async () => {
    jest.mocked(getFeedPrayers).mockRejectedValue(new Error('network') as never);

    render(<FeedScreen navigation={navigation as never} route={route} />);

    await waitFor(() => expect(screen.getByText('Retry')).toBeTruthy());
  });

  it('navigates to prayer detail when a card is tapped', async () => {
    jest.mocked(getFeedPrayers).mockResolvedValue(prayers as never);

    render(<FeedScreen navigation={navigation as never} route={route} />);

    await waitFor(() => expect(screen.getByText('Please pray for my family')).toBeTruthy());

    fireEvent.press(screen.getByText('Please pray for my family'));

    expect((navigation as unknown as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith(
      'PrayerDetail',
      { prayerId: 'p1' }
    );
  });
});
