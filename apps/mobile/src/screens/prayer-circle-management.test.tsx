import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { PrayerCircleManagementScreen } from './prayer-circle-management';

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  Check: () => null,
  Search: () => null,
  UserMinus: () => null,
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

jest.mock('../hooks/auth-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@oratio/shared/queries', () => ({
  cancelPrayerCircleInvite: jest.fn(),
  getPrayerCircle: jest.fn(),
  getPrayerCircleInvites: jest.fn(),
  getProfileByUsername: jest.fn(),
  removeFromPrayerCircle: jest.fn(),
  respondToPrayerCircleInvite: jest.fn(),
  searchUsers: jest.fn(),
  sendPrayerCircleInvite: jest.fn(),
}));

import { useAuth } from '../hooks/auth-context';
import {
  cancelPrayerCircleInvite,
  getPrayerCircle,
  getPrayerCircleInvites,
  getProfileByUsername,
  removeFromPrayerCircle,
  respondToPrayerCircleInvite,
  searchUsers,
  sendPrayerCircleInvite,
} from '@oratio/shared/queries';

const member = {
  id: 'member-1',
  username: 'miriam',
  display_name: 'Miriam',
  avatar_url: null,
  connected_at: new Date().toISOString(),
};

const incomingInvite = {
  id: 'invite-in',
  requester_id: 'jonah-id',
  recipient_id: 'user-1',
  message: null,
  created_at: new Date().toISOString(),
  requester: {
    id: 'jonah-id',
    username: 'jonah',
    display_name: 'Jonah',
    avatar_url: null,
  },
  recipient: {
    id: 'user-1',
    username: 'testuser',
    display_name: 'Test User',
    avatar_url: null,
  },
};

const outgoingInvite = {
  id: 'invite-out',
  requester_id: 'user-1',
  recipient_id: 'esther-id',
  message: null,
  created_at: new Date().toISOString(),
  requester: incomingInvite.recipient,
  recipient: {
    id: 'esther-id',
    username: 'esther',
    display_name: 'Esther',
    avatar_url: null,
  },
};

const navigation = { goBack: jest.fn() } as never;
const route = {} as never;

describe('PrayerCircleManagementScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      profile: { username: 'testuser', display_name: 'Test User' },
      loading: false,
    } as never);
    jest.mocked(getPrayerCircle).mockResolvedValue([member] as never);
    jest.mocked(getPrayerCircleInvites).mockResolvedValue({
      incoming: [incomingInvite],
      outgoing: [outgoingInvite],
    } as never);
    jest.mocked(respondToPrayerCircleInvite).mockResolvedValue(true);
    jest.mocked(cancelPrayerCircleInvite).mockResolvedValue(true);
    jest.mocked(removeFromPrayerCircle).mockResolvedValue(true);
    jest.mocked(sendPrayerCircleInvite).mockResolvedValue(true);
  });

  it('shows capacity, pending invites, and accepted members', async () => {
    render(<PrayerCircleManagementScreen navigation={navigation} route={route} />);

    expect(await screen.findByLabelText('1 of 12 spaces filled')).toBeTruthy();
    expect(screen.getByText('Invites to respond to')).toBeTruthy();
    expect(screen.getByText('Invites sent')).toBeTruthy();
    expect(screen.getByLabelText('Accept invite from @jonah')).toBeTruthy();
    expect(screen.getByLabelText('Cancel invite to @esther')).toBeTruthy();
    expect(screen.getByLabelText('Remove @miriam from Prayer Circle')).toBeTruthy();
  });

  it('accepts an incoming invite and refreshes the Circle', async () => {
    render(<PrayerCircleManagementScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('Accept invite from @jonah'));

    await waitFor(() =>
      expect(respondToPrayerCircleInvite).toHaveBeenCalledWith('invite-in', 'accepted')
    );
    await waitFor(() => expect(getPrayerCircle).toHaveBeenCalledTimes(2));
  });

  it('searches by username and sends a mutual invite', async () => {
    jest
      .mocked(searchUsers)
      .mockResolvedValue([{ username: 'daniel', display_name: 'Daniel' }] as never);
    jest.mocked(getProfileByUsername).mockResolvedValue({ id: 'daniel-id' } as never);

    render(<PrayerCircleManagementScreen navigation={navigation} route={route} />);

    fireEvent.changeText(await screen.findByPlaceholderText('Search by @username'), '@daniel');
    const inviteButton = await screen.findByLabelText(
      'Invite @daniel to your Prayer Circle',
      {},
      { timeout: 2000 }
    );
    fireEvent.press(inviteButton);

    await waitFor(() => expect(sendPrayerCircleInvite).toHaveBeenCalledWith('daniel-id'));
    expect(await screen.findByText('Invite sent to @daniel.')).toBeTruthy();
    await waitFor(() => expect(getPrayerCircle).toHaveBeenCalledTimes(2));
  });

  it('confirms before removing an accepted member', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.text === 'Remove')?.onPress?.();
    });

    render(<PrayerCircleManagementScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('Remove @miriam from Prayer Circle'));

    await waitFor(() => expect(removeFromPrayerCircle).toHaveBeenCalledWith('member-1'));
    await waitFor(() => expect(getPrayerCircle).toHaveBeenCalledTimes(2));
  });
});
