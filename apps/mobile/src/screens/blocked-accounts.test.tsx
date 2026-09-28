import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { getBlockedAccounts, unblockUser, type BlockedAccount } from '@oratio/shared/queries';
import { BlockedAccountsScreen } from './blocked-accounts';

jest.mock('lucide-react-native', () => ({ ArrowLeft: () => null, UserCheck: () => null }));
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => useEffect(callback, [callback]),
  };
});
jest.mock('@oratio/shared/queries', () => ({
  BLOCKED_ACCOUNTS_PAGE_SIZE: 50,
  getBlockedAccounts: jest.fn(),
  unblockUser: jest.fn(),
}));

const account: BlockedAccount = {
  id: 'account-2',
  username: 'jonah',
  display_name: 'Jonah',
  avatar_url: null,
  blocked_at: '2026-09-28T10:00:00Z',
};
const renderList = () =>
  render(<BlockedAccountsScreen navigation={{ goBack: jest.fn() } as never} route={{} as never} />);

describe('BlockedAccountsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getBlockedAccounts).mockResolvedValue([account]);
    jest.mocked(unblockUser).mockResolvedValue(undefined);
  });

  it('shows blocked identity and waits for unblock confirmation', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderList();
    fireEvent.press(await screen.findByLabelText('Unblock @jonah'));
    expect(screen.getByText('Jonah')).toBeTruthy();
    expect(unblockUser).not.toHaveBeenCalled();
    expect(alert.mock.calls[0][1]).toContain('does not restore');
    act(() => {
      alert.mock.calls[0][2]?.[0]?.onPress?.();
    });
    expect(unblockUser).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('removes the entry and reloads after one confirmed unblock', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderList();
    fireEvent.press(await screen.findByLabelText('Unblock @jonah'));
    jest.mocked(getBlockedAccounts).mockResolvedValue([]);
    const confirm = alert.mock.calls[0][2]?.[1];
    await act(async () => {
      confirm?.onPress?.();
      confirm?.onPress?.();
    });
    expect(unblockUser).toHaveBeenCalledTimes(1);
    expect(unblockUser).toHaveBeenCalledWith(account.id);
    expect(await screen.findByText('No blocked accounts')).toBeTruthy();
    alert.mockRestore();
  });

  it('retains the entry when unblock fails', async () => {
    jest.mocked(unblockUser).mockRejectedValueOnce(new Error('Network failure'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderList();
    fireEvent.press(await screen.findByLabelText('Unblock @jonah'));
    await act(async () => {
      alert.mock.calls[0][2]?.[1]?.onPress?.();
    });
    expect(
      await screen.findByText("We couldn't unblock this account. Please try again.")
    ).toBeTruthy();
    expect(screen.getByText('Jonah')).toBeTruthy();
    alert.mockRestore();
  });

  it('does not claim the list is empty on an error and can retry', async () => {
    jest.mocked(getBlockedAccounts).mockRejectedValueOnce(new Error('Not available'));
    renderList();
    expect(
      await screen.findByText("We couldn't load blocked accounts. Please try again.")
    ).toBeTruthy();
    expect(screen.queryByText('No blocked accounts')).toBeNull();
    fireEvent.press(screen.getByText('Retry'));
    expect(await screen.findByText('Jonah')).toBeTruthy();
  });

  it('paginates without silently dropping the first page', async () => {
    jest
      .mocked(getBlockedAccounts)
      .mockResolvedValueOnce(
        Array.from({ length: 50 }, (_, i) => ({
          ...account,
          id: `account-${i}`,
          username: `member${i}`,
        }))
      )
      .mockResolvedValueOnce([]);
    renderList();
    fireEvent.press(await screen.findByText('Load more'));
    await act(async () => {});
    expect(getBlockedAccounts).toHaveBeenLastCalledWith(50);
    expect(screen.queryByText('No blocked accounts')).toBeNull();
    expect(screen.queryByText('Load more')).toBeNull();
  });
});
