import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ProfileCircleActions } from './profile-circle-actions';

jest.mock('lucide-react-native', () => ({
  Check: () => null,
  Clock: () => null,
  UserPlus: () => null,
  UsersRound: () => null,
  X: () => null,
}));
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => useEffect(callback, [callback]),
  };
});
jest.mock('@oratio/shared/queries', () => ({
  cancelPrayerCircleInvite: jest.fn(),
  getPrayerCircleCount: jest.fn(),
  getPrayerCircleStatus: jest.fn(),
  respondToPrayerCircleInvite: jest.fn(),
  sendPrayerCircleInvite: jest.fn(),
}));

import {
  cancelPrayerCircleInvite,
  getPrayerCircleCount,
  getPrayerCircleStatus,
  respondToPrayerCircleInvite,
  sendPrayerCircleInvite,
} from '@oratio/shared/queries';

const props = {
  recipientId: 'miriam-id',
  username: 'miriam',
  viewerId: 'viewer-id',
  refreshing: false,
  onAccepted: jest.fn<() => Promise<void>>(),
  onManage: jest.fn(),
};

describe('ProfileCircleActions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(getPrayerCircleStatus).mockResolvedValue({ state: 'none' });
    jest.mocked(getPrayerCircleCount).mockResolvedValue(2);
    jest.mocked(sendPrayerCircleInvite).mockResolvedValue(true);
    jest.mocked(cancelPrayerCircleInvite).mockResolvedValue(true);
    jest.mocked(respondToPrayerCircleInvite).mockResolvedValue(true);
    props.onAccepted.mockResolvedValue(undefined);
  });

  it('checks the relationship before offering an invitation', async () => {
    render(<ProfileCircleActions {...props} />);
    expect(screen.queryByText('Invite to Prayer Circle')).toBeNull();
    expect(await screen.findByText('Invite to Prayer Circle')).toBeTruthy();
    expect(getPrayerCircleStatus).toHaveBeenCalledWith('miriam-id', { throwOnError: true });
    expect(getPrayerCircleCount).toHaveBeenCalledWith('viewer-id', { throwOnError: true });
  });

  it('sends once, confirms only after success, and supports cancelling the pending invite', async () => {
    let resolve!: (ok: boolean) => void;
    jest.mocked(sendPrayerCircleInvite).mockImplementationOnce(
      () =>
        new Promise<boolean>((done) => {
          resolve = done;
        })
    );
    render(<ProfileCircleActions {...props} />);
    const invite = await screen.findByText('Invite to Prayer Circle');
    act(() => {
      fireEvent.press(invite);
      fireEvent.press(invite);
    });
    expect(sendPrayerCircleInvite).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Invite sent to @miriam.')).toBeNull();
    jest
      .mocked(getPrayerCircleStatus)
      .mockResolvedValue({ state: 'pending_sent', inviteId: 'invite-out' });
    await act(async () => resolve(true));
    expect(await screen.findByText('Invite sent to @miriam.')).toBeTruthy();
    const cancel = await screen.findByText('Cancel invite');
    jest.mocked(getPrayerCircleStatus).mockResolvedValue({ state: 'none' });
    fireEvent.press(cancel);
    expect(await screen.findByText('Invite cancelled.')).toBeTruthy();
    expect(cancelPrayerCircleInvite).toHaveBeenCalledWith('invite-out');
    expect(await screen.findByText('Invite to Prayer Circle')).toBeTruthy();
  });

  it('accepts an incoming invite and refreshes visible prayers before showing the connection', async () => {
    jest
      .mocked(getPrayerCircleStatus)
      .mockResolvedValue({ state: 'pending_received', inviteId: 'invite-in' });
    render(<ProfileCircleActions {...props} />);
    const accept = await screen.findByText('Accept invite');
    jest.mocked(getPrayerCircleStatus).mockResolvedValue({ state: 'connected' });
    fireEvent.press(accept);
    expect(await screen.findByText('In your Prayer Circle')).toBeTruthy();
    expect(respondToPrayerCircleInvite).toHaveBeenCalledWith('invite-in', 'accepted');
    expect(props.onAccepted).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText('Manage Prayer Circle'));
    expect(props.onManage).toHaveBeenCalledTimes(1);
  });

  it('declines without exposing new prayers', async () => {
    jest
      .mocked(getPrayerCircleStatus)
      .mockResolvedValue({ state: 'pending_received', inviteId: 'invite-in' });
    render(<ProfileCircleActions {...props} />);
    const decline = await screen.findByText('Decline');
    jest.mocked(getPrayerCircleStatus).mockResolvedValue({ state: 'none' });
    fireEvent.press(decline);
    expect(await screen.findByText('Invite declined.')).toBeTruthy();
    expect(respondToPrayerCircleInvite).toHaveBeenCalledWith('invite-in', 'declined');
    expect(props.onAccepted).not.toHaveBeenCalled();
  });

  it('blocks inviting at capacity and offers Circle management', async () => {
    jest.mocked(getPrayerCircleCount).mockResolvedValue(12);
    render(<ProfileCircleActions {...props} />);
    const full = await screen.findByRole('button', { name: 'Prayer Circle full (12/12)' });
    expect(full).toBeDisabled();
    fireEvent.press(full);
    expect(sendPrayerCircleInvite).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Manage Prayer Circle'));
    expect(props.onManage).toHaveBeenCalled();
  });

  it('blocks accepting at capacity but still allows declining', async () => {
    jest.mocked(getPrayerCircleCount).mockResolvedValue(12);
    jest
      .mocked(getPrayerCircleStatus)
      .mockResolvedValue({ state: 'pending_received', inviteId: 'invite-in' });
    render(<ProfileCircleActions {...props} />);
    expect(await screen.findByRole('button', { name: 'Accept invite' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeEnabled();
  });

  it.each(['status', 'count'])(
    'keeps failed %s reads recoverable without offering an invite',
    async (query) => {
      if (query === 'status')
        jest.mocked(getPrayerCircleStatus).mockRejectedValueOnce(new Error('offline'));
      else jest.mocked(getPrayerCircleCount).mockRejectedValueOnce(new Error('offline'));
      render(<ProfileCircleActions {...props} />);
      fireEvent.press(await screen.findByText('Refresh Prayer Circle'));
      expect(sendPrayerCircleInvite).not.toHaveBeenCalled();
      expect(await screen.findByText('Invite to Prayer Circle')).toBeTruthy();
    }
  );

  it.each(['rejected', 'failed'])(
    'does not claim success when sending is %s and permits retry',
    async (result) => {
      if (result === 'rejected')
        jest.mocked(sendPrayerCircleInvite).mockRejectedValueOnce(new Error('offline'));
      else jest.mocked(sendPrayerCircleInvite).mockResolvedValueOnce(false);
      render(<ProfileCircleActions {...props} />);
      fireEvent.press(await screen.findByText('Invite to Prayer Circle'));
      await screen.findByText(/We couldn't send the invite/);
      expect(screen.queryByText('Invite sent to @miriam.')).toBeNull();
      fireEvent.press(await screen.findByText('Invite to Prayer Circle'));
      expect(await screen.findByText('Invite sent to @miriam.')).toBeTruthy();
      expect(sendPrayerCircleInvite).toHaveBeenCalledTimes(2);
    }
  );

  it.each(['cancel', 'accept', 'decline'])(
    'preserves the relationship when %s fails',
    async (action) => {
      jest.mocked(getPrayerCircleStatus).mockResolvedValue({
        state: action === 'cancel' ? 'pending_sent' : 'pending_received',
        inviteId: 'invite-1',
      });
      jest.mocked(cancelPrayerCircleInvite).mockResolvedValue(false);
      jest.mocked(respondToPrayerCircleInvite).mockResolvedValue(false);
      render(<ProfileCircleActions {...props} />);
      fireEvent.press(
        await screen.findByText(
          action === 'cancel' ? 'Cancel invite' : action === 'accept' ? 'Accept invite' : 'Decline'
        )
      );
      expect(await screen.findByText(new RegExp(`We couldn't ${action} the invite`))).toBeTruthy();
      expect(props.onAccepted).not.toHaveBeenCalled();
      expect(screen.queryByText('In your Prayer Circle')).toBeNull();
    }
  );

  it('does not re-offer sending if the post-send status refresh fails', async () => {
    render(<ProfileCircleActions {...props} />);
    const invite = await screen.findByText('Invite to Prayer Circle');
    jest.mocked(getPrayerCircleStatus).mockRejectedValueOnce(new Error('offline'));
    fireEvent.press(invite);
    expect(await screen.findByText('Refresh Prayer Circle')).toBeTruthy();
    expect(screen.getByText('Invite sent to @miriam.')).toBeTruthy();
    expect(screen.queryByText('Invite to Prayer Circle')).toBeNull();
  });

  it('refreshes changes made on another device when the profile is pulled to refresh', async () => {
    const { rerender } = render(<ProfileCircleActions {...props} />);
    await screen.findByText('Invite to Prayer Circle');
    jest.mocked(getPrayerCircleStatus).mockResolvedValue({ state: 'connected' });
    rerender(<ProfileCircleActions {...props} refreshing />);
    expect(await screen.findByText('In your Prayer Circle')).toBeTruthy();
  });

  it('ignores a stale relationship response after refresh', async () => {
    let resolve!: (value: { state: 'none' }) => void;
    jest.mocked(getPrayerCircleStatus).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    const { rerender } = render(<ProfileCircleActions {...props} />);
    jest.mocked(getPrayerCircleStatus).mockResolvedValue({ state: 'connected' });
    rerender(<ProfileCircleActions {...props} refreshing />);
    await screen.findByText('In your Prayer Circle');
    await act(async () => resolve({ state: 'none' }));
    expect(screen.getByText('In your Prayer Circle')).toBeTruthy();
    expect(screen.queryByText('Invite to Prayer Circle')).toBeNull();
  });

  it('ignores a completed acceptance after leaving the profile', async () => {
    let resolve!: (ok: boolean) => void;
    jest
      .mocked(getPrayerCircleStatus)
      .mockResolvedValue({ state: 'pending_received', inviteId: 'invite-in' });
    jest.mocked(respondToPrayerCircleInvite).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    const { unmount } = render(<ProfileCircleActions {...props} />);
    fireEvent.press(await screen.findByText('Accept invite'));
    unmount();
    await act(async () => resolve(true));
    expect(props.onAccepted).not.toHaveBeenCalled();
  });
});
