import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, Modal } from 'react-native';
import { UserProfileScreen } from './user-profile';
import { ProfileActionsSheet } from '../components/profile-actions-sheet';

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  Ban: () => null,
  MoreHorizontal: () => null,
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

function dismissOptionsSheet() {
  fireEvent(screen.UNSAFE_getByType(ProfileActionsSheet).findByType(Modal), 'dismiss');
}

async function chooseBlock() {
  fireEvent.press(await screen.findByLabelText('More profile options'));
  fireEvent.press(screen.getByLabelText('Block user'));
  dismissOptionsSheet();
}

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
    expect(screen.getByLabelText('More profile options')).toBeTruthy();
    expect(screen.queryByLabelText('Block user')).toBeNull();

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
    expect(screen.queryByLabelText('More profile options')).toBeNull();
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
    expect(screen.queryByLabelText('More profile options')).toBeNull();
    expect(getPrayerCircleStatus).not.toHaveBeenCalled();
  });

  it('does not offer profile actions to a signed-out viewer', async () => {
    jest.mocked(useAuth).mockReturnValue({ user: null } as never);
    render(<UserProfileScreen navigation={navigation} route={route} />);
    await screen.findByText('Miriam');
    expect(screen.queryByLabelText('More profile options')).toBeNull();
    expect(screen.queryByLabelText('Block user')).toBeNull();
  });

  it.each(['Close profile options', 'Dismiss profile options'])(
    'closes the options via %s without starting a block',
    async (label) => {
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      render(<UserProfileScreen navigation={navigation} route={route} />);
      fireEvent.press(await screen.findByLabelText('More profile options'));
      expect(screen.getByLabelText('Block user')).toBeTruthy();
      fireEvent.press(screen.getByLabelText(label));
      dismissOptionsSheet();
      expect(screen.queryByLabelText('Block user')).toBeNull();
      expect(alert).not.toHaveBeenCalled();
      expect(blockUser).not.toHaveBeenCalled();
      expect(reset).not.toHaveBeenCalled();
      fireEvent.press(screen.getByLabelText('More profile options'));
      expect(screen.getByLabelText('Block user')).toBeTruthy();
      alert.mockRestore();
    }
  );

  it('waits for the iOS options sheet to dismiss before presenting one block confirmation', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<UserProfileScreen navigation={navigation} route={route} />);
    fireEvent.press(await screen.findByLabelText('More profile options'));
    fireEvent.press(screen.getByLabelText('Block user'));
    expect(alert).not.toHaveBeenCalled();
    expect(blockUser).not.toHaveBeenCalled();
    dismissOptionsSheet();
    dismissOptionsSheet();
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][0]).toBe('Block @miriam?');
    alert.mockRestore();
  });

  it('drops a queued confirmation if the viewer signs out while the sheet is closing', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { rerender } = render(<UserProfileScreen navigation={navigation} route={route} />);
    fireEvent.press(await screen.findByLabelText('More profile options'));
    const onDismiss = screen.UNSAFE_getByType(ProfileActionsSheet).findByType(Modal)
      .props.onDismiss;
    fireEvent.press(screen.getByLabelText('Block user'));
    jest.mocked(useAuth).mockReturnValue({ user: null } as never);
    rerender(<UserProfileScreen navigation={navigation} route={route} />);
    act(() => onDismiss());
    expect(alert).not.toHaveBeenCalled();
    expect(blockUser).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('closes on the native back request without starting a block', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<UserProfileScreen navigation={navigation} route={route} />);
    fireEvent.press(await screen.findByLabelText('More profile options'));
    fireEvent(screen.UNSAFE_getByType(ProfileActionsSheet).findByType(Modal), 'requestClose');
    dismissOptionsSheet();
    expect(screen.queryByLabelText('Block user')).toBeNull();
    expect(alert).not.toHaveBeenCalled();
    expect(blockUser).not.toHaveBeenCalled();
    alert.mockRestore();
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
    await chooseBlock();
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
    await chooseBlock();
    await act(async () => {
      alert.mock.calls[0][2]?.[1]?.onPress?.();
    });
    expect(reset).not.toHaveBeenCalled();
    expect(alert).toHaveBeenLastCalledWith('Account not blocked', 'Please try again.');
    await chooseBlock();
    expect(alert.mock.calls.at(-1)?.[0]).toBe('Block @miriam?');
    alert.mockRestore();
  });

  it('cancels blocking without changing data or navigation', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<UserProfileScreen navigation={navigation} route={route} />);
    await chooseBlock();
    act(() => {
      alert.mock.calls[0][2]?.[0]?.onPress?.();
    });
    expect(blockUser).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
    alert.mockRestore();
  });
});
