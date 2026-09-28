import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { UserProfileScreen } from './user-profile';

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  Ban: () => null,
  Check: () => null,
  Clock: () => null,
  UserPlus: () => null,
  UsersRound: () => null,
  X: () => null,
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
  blockUser: jest.fn(),
  getUserPrayers: jest.fn(),
  cancelPrayerCircleInvite: jest.fn(),
  getPrayerCircleCount: jest.fn(),
  getPrayerCircleStatus: jest.fn(),
  respondToPrayerCircleInvite: jest.fn(),
  sendPrayerCircleInvite: jest.fn(),
}));

jest.mock('../hooks/auth-context', () => ({ useAuth: jest.fn() }));

import { useAuth } from '../hooks/auth-context';
import {
  getProfileByUsername,
  blockUser,
  getUserPrayers,
  getPrayerCircleCount,
  getPrayerCircleStatus,
  sendPrayerCircleInvite,
} from '@oratio/shared/queries';

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

const reset = jest.fn();
const navigation = { goBack: jest.fn(), navigate: jest.fn(), reset } as never;
const route = { params: { username: 'miriam' } } as never;

describe('UserProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue({ user: { id: 'viewer-id' } } as never);
    jest.mocked(getProfileByUsername).mockResolvedValue(profile as never);
    jest.mocked(getUserPrayers).mockResolvedValue([prayer] as never);
    jest.mocked(getPrayerCircleCount).mockResolvedValue(0);
    jest.mocked(getPrayerCircleStatus).mockResolvedValue({ state: 'none' });
    jest.mocked(sendPrayerCircleInvite).mockResolvedValue(true);
    jest.mocked(blockUser).mockResolvedValue(undefined);
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

  it('invites the resolved profile ID, including when opened through a username alias', async () => {
    render(
      <UserProfileScreen
        navigation={navigation}
        route={{ params: { username: 'old-name' } } as never}
      />
    );
    fireEvent.press(await screen.findByText('Invite to Prayer Circle'));
    await waitFor(() => expect(sendPrayerCircleInvite).toHaveBeenCalledWith('miriam-id'));
    expect(await screen.findByText('Invite sent to @miriam.')).toBeTruthy();
  });

  it("does not offer Circle invitations on the signed-in user's own profile", async () => {
    jest.mocked(useAuth).mockReturnValue({ user: { id: profile.id } } as never);
    render(<UserProfileScreen navigation={navigation} route={route} />);
    await screen.findByText('Miriam');
    expect(screen.queryByText('Invite to Prayer Circle')).toBeNull();
    expect(screen.queryByLabelText('Block user')).toBeNull();
    expect(getPrayerCircleStatus).not.toHaveBeenCalled();
  });

  it('opens existing Circle management for a connected profile', async () => {
    jest.mocked(getPrayerCircleStatus).mockResolvedValue({ state: 'connected' });
    render(<UserProfileScreen navigation={navigation} route={route} />);
    fireEvent.press(await screen.findByText('Manage Prayer Circle'));
    expect((navigation as unknown as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith(
      'PrayerCircleManagement'
    );
  });

  it('confirms blocking before sending and clears the native stack on success', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<UserProfileScreen navigation={navigation} route={route} />);
    fireEvent.press(await screen.findByLabelText('Block user'));
    expect(blockUser).not.toHaveBeenCalled();
    expect(alert.mock.calls[0][0]).toBe('Block @miriam?');
    const confirm = alert.mock.calls[0][2]?.find((button) => button.text === 'Block');
    await act(async () => {
      confirm?.onPress?.();
      confirm?.onPress?.();
    });
    expect(blockUser).toHaveBeenCalledTimes(1);
    expect(blockUser).toHaveBeenCalledWith(profile.id);
    expect(reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Main', params: { screen: 'Public' } }],
    });
    expect(alert).toHaveBeenLastCalledWith('Account blocked');
    alert.mockRestore();
  });

  it('keeps the profile when blocking fails and permits a retry', async () => {
    jest.mocked(blockUser).mockRejectedValueOnce(new Error('Please try again.'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<UserProfileScreen navigation={navigation} route={route} />);
    fireEvent.press(await screen.findByLabelText('Block user'));
    await act(async () => {
      alert.mock.calls[0][2]?.[1]?.onPress?.();
    });
    expect(reset).not.toHaveBeenCalled();
    expect(alert).toHaveBeenLastCalledWith('Account not blocked', 'Please try again.');
    fireEvent.press(screen.getByLabelText('Block user'));
    expect(alert.mock.calls.at(-1)?.[0]).toBe('Block @miriam?');
    alert.mockRestore();
  });

  it('cancels blocking without changing data or navigation', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<UserProfileScreen navigation={navigation} route={route} />);
    fireEvent.press(await screen.findByLabelText('Block user'));
    act(() => {
      alert.mock.calls[0][2]?.[0]?.onPress?.();
    });
    expect(blockUser).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
    alert.mockRestore();
  });
});
