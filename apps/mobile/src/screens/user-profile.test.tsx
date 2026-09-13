import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { UserProfileScreen } from './user-profile';

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
}));

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      useEffect(callback, [callback]);
    },
  };
});

jest.mock('@oratio/shared/queries', () => ({
  getProfileByUsername: jest.fn(),
  getUserPrayers: jest.fn(),
}));

import { getProfileByUsername, getUserPrayers } from '@oratio/shared/queries';

const profile = {
  id: 'miriam-id',
  username: 'miriam',
  display_name: 'Miriam',
  avatar_url: null,
  created_at: '2026-01-12T10:00:00.000Z',
};

const prayer = {
  id: 'prayer-1',
  city: 'London',
  country: 'United Kingdom',
  text: 'Please pray for renewed strength this week',
  username: 'miriam',
  prayerCount: 4,
  lat: 51.5,
  lng: -0.1,
  createdAt: '2026-09-12T10:00:00.000Z',
  audience: 'public',
};

const navigation = { goBack: jest.fn(), navigate: jest.fn() } as never;
const route = { params: { username: 'miriam' } } as never;

describe('UserProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getProfileByUsername).mockResolvedValue(profile as never);
    jest.mocked(getUserPrayers).mockResolvedValue([prayer] as never);
  });

  it('shows the profile and opens a visible prayer', async () => {
    render(<UserProfileScreen navigation={navigation} route={route} />);

    expect(await screen.findByText('Miriam')).toBeTruthy();
    expect(screen.getAllByText('@miriam').length).toBeGreaterThan(0);
    expect(screen.getByText('Joined January 2026')).toBeTruthy();
    expect(screen.getByText('Please pray for renewed strength this week')).toBeTruthy();

    fireEvent.press(screen.getByText('Please pray for renewed strength this week'));
    expect((navigation as unknown as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith(
      'PrayerDetail',
      { prayerId: 'prayer-1' }
    );
  });

  it('shows a calm unavailable state when the profile cannot be resolved', async () => {
    jest.mocked(getProfileByUsername).mockResolvedValue(null as never);
    jest.mocked(getUserPrayers).mockResolvedValue([] as never);

    render(<UserProfileScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByText('This profile is unavailable.')).toBeTruthy());
  });
});
