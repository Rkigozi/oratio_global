import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert, Linking } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SettingsScreen } from './settings';
import { canSendMonitoringTest, sendMonitoringTest } from '../services/monitoring';

const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const mockSignOut = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockSetThemeMode = jest.fn();

jest.mock('../services/monitoring', () => ({
  canSendMonitoringTest: jest.fn(() => false),
  sendMonitoringTest: jest.fn(),
}));

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  Ban: () => null,
  ChevronRight: () => null,
  Bell: () => null,
  CircleHelp: () => null,
  ExternalLink: () => null,
  FileText: () => null,
  Globe2: () => null,
  HeartHandshake: () => null,
  LogOut: () => null,
  MessageCircle: () => null,
  Monitor: () => null,
  Moon: () => null,
  Palette: () => null,
  Shield: () => null,
  Sun: () => null,
  Trash2: () => null,
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
  useAuth: () => ({
    user: { id: 'user-1', email: 'miriam@example.com' },
    signOut: mockSignOut,
  }),
}));

jest.mock('../hooks/theme-context', () => ({
  useTheme: () => ({
    theme: 'dark',
    themeMode: 'system',
    setThemeMode: mockSetThemeMode,
  }),
}));

jest.mock('@oratio/shared/queries', () => ({
  deleteAccount: jest.fn(),
  getProfilePreferences: jest.fn(),
  updateProfilePreferences: jest.fn(),
}));

import {
  deleteAccount,
  getProfilePreferences,
  updateProfilePreferences,
} from '@oratio/shared/queries';

const preferences = {
  notify_on_prayed: true,
  notify_on_comment: true,
  language: 'auto',
  comments_enabled_default: true,
  profile_location_mode: 'manual',
  theme: 'system',
};

function renderSettings() {
  return render(<SettingsScreen navigation={navigation as never} route={{} as never} />);
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(canSendMonitoringTest).mockReturnValue(false);
    jest.mocked(getProfilePreferences).mockResolvedValue(preferences as never);
    jest.mocked(updateProfilePreferences).mockResolvedValue(true as never);
    jest.mocked(deleteAccount).mockResolvedValue(null as never);
  });

  it('loads profile preferences', async () => {
    renderSettings();

    expect(await screen.findByText('Prayers offered')).toBeTruthy();
    expect(screen.getByText('Comments and replies')).toBeTruthy();
    expect(screen.getByText('Allow comments on new public prayers')).toBeTruthy();
    expect(screen.getByLabelText('System appearance')).toBeTruthy();
    expect(screen.getByLabelText('Light appearance')).toBeTruthy();
    expect(screen.getByLabelText('Dark appearance')).toBeTruthy();
    expect(screen.getByText('miriam@example.com')).toBeTruthy();
  });

  it('does not show diagnostics when reporting is off or on a production build', async () => {
    renderSettings();
    await screen.findByText('Prayers offered');
    expect(screen.queryByLabelText('Send test error')).toBeNull();
  });

  it('queues a non-production test once and explicitly requires delivery verification', async () => {
    jest.mocked(canSendMonitoringTest).mockReturnValue(true);
    jest.mocked(sendMonitoringTest).mockReturnValue('c'.repeat(32));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderSettings();
    await screen.findByText('Prayers offered');
    fireEvent.press(screen.getByLabelText('Send test error'));
    expect(alert).toHaveBeenCalledWith(
      'Test error queued',
      expect.stringContaining('confirmed in Sentry')
    );
    expect(screen.getByLabelText('Send test error')).toBeDisabled();
    fireEvent.press(screen.getByLabelText('Send test error'));
    expect(sendMonitoringTest).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });

  it('allows retry after a test could not be queued', async () => {
    jest.mocked(canSendMonitoringTest).mockReturnValue(true);
    jest.mocked(sendMonitoringTest).mockReturnValue(null);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderSettings();
    await screen.findByText('Prayers offered');
    fireEvent.press(screen.getByLabelText('Send test error'));
    expect(alert).toHaveBeenCalledWith('Test error not queued', expect.any(String));
    expect(screen.getByLabelText('Send test error')).not.toBeDisabled();
    alert.mockRestore();
  });

  it('opens blocked accounts from Settings', async () => {
    renderSettings();
    fireEvent.press(await screen.findByLabelText('Blocked accounts'));
    expect(navigation.navigate).toHaveBeenCalledWith('BlockedAccounts');
  });

  it('updates toggle preferences optimistically', async () => {
    renderSettings();

    fireEvent(await screen.findByLabelText('Prayers offered'), 'valueChange', false);

    await waitFor(() =>
      expect(updateProfilePreferences).toHaveBeenCalledWith(
        { notify_on_prayed: false },
        expect.objectContaining({ expectedUserId: 'user-1' })
      )
    );
  });

  it('updates translation language', async () => {
    renderSettings();

    fireEvent.press(await screen.findByText('Spanish'));

    await waitFor(() =>
      expect(updateProfilePreferences).toHaveBeenCalledWith(
        { language: 'es' },
        expect.objectContaining({ expectedUserId: 'user-1' })
      )
    );
  });

  it('applies and saves the selected appearance', async () => {
    renderSettings();

    fireEvent.press(await screen.findByLabelText('Dark appearance'));

    await waitFor(() =>
      expect(updateProfilePreferences).toHaveBeenCalledWith(
        { theme: 'dark' },
        expect.objectContaining({ expectedUserId: 'user-1' })
      )
    );
    await waitFor(() => expect(mockSetThemeMode).toHaveBeenCalledWith('dark'));
  });

  it('restores the previous appearance when saving fails', async () => {
    jest.mocked(updateProfilePreferences).mockResolvedValueOnce(false as never);
    renderSettings();

    fireEvent.press(await screen.findByLabelText('Dark appearance'));

    await waitFor(() =>
      expect(screen.getByText("We couldn't save settings. Please try again.")).toBeTruthy()
    );
    expect(mockSetThemeMode).toHaveBeenLastCalledWith('system');
  });

  it('keeps an uncertain preference locked and retries the original desired value', async () => {
    jest.mocked(updateProfilePreferences).mockRejectedValueOnce(new Error('lost confirmation'));
    renderSettings();
    fireEvent.press(await screen.findByLabelText('Dark appearance'));
    const retry = await screen.findByText('Check and retry');
    expect(mockSetThemeMode).toHaveBeenLastCalledWith('dark');
    expect(screen.getByLabelText('Light appearance')).toBeDisabled();
    fireEvent.press(retry);
    await waitFor(() => expect(screen.queryByText('Check and retry')).toBeNull());
    const calls = jest.mocked(updateProfilePreferences).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual([
      { theme: 'dark' },
      expect.objectContaining({ requestId: calls[0][1]?.requestId, verifyExisting: true }),
    ]);
  });

  it('confirms sign out before clearing the session', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.[1]?.onPress?.();
    });

    renderSettings();
    fireEvent.press(await screen.findByLabelText('Sign out'));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    alert.mockRestore();
  });

  it('opens the production privacy, terms, and support destinations', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    renderSettings();

    fireEvent.press(await screen.findByLabelText('Help with Oratio'));
    fireEvent.press(screen.getByLabelText('Privacy policy'));
    fireEvent.press(screen.getByLabelText('Terms of service'));
    fireEvent.press(screen.getByLabelText('Safety & crisis support'));

    await waitFor(() => {
      expect(openURL).toHaveBeenCalledWith('https://oratiotest.netlify.app/support');
      expect(openURL).toHaveBeenCalledWith('https://oratiotest.netlify.app/privacy');
      expect(openURL).toHaveBeenCalledWith('https://oratiotest.netlify.app/terms');
      expect(openURL).toHaveBeenCalledWith('https://findahelpline.com/');
    });
    openURL.mockRestore();
  });

  it('requires two deliberate confirmations before deleting the account', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderSettings();

    fireEvent.press(await screen.findByLabelText('Delete account'));

    expect(alert).toHaveBeenCalledWith(
      'Delete account?',
      expect.stringContaining('permanently deleted'),
      expect.any(Array)
    );
    expect(deleteAccount).not.toHaveBeenCalled();

    alert.mock.calls[0][2]?.find((button) => button.text === 'Continue')?.onPress?.();

    expect(alert).toHaveBeenLastCalledWith(
      'Delete account forever?',
      expect.stringContaining('cannot be undone'),
      expect.any(Array)
    );
    expect(deleteAccount).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('deletes through the shared backend before clearing the local session', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons
        ?.find((button) => button.text === 'Continue' || button.text === 'Delete forever')
        ?.onPress?.();
    });
    renderSettings();

    fireEvent.press(await screen.findByLabelText('Delete account'));

    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(alert.mock.calls.map(([title]) => title)).toEqual([
      'Delete account?',
      'Delete account forever?',
    ]);
    alert.mockRestore();
  });

  it('keeps the session when account deletion fails and explains how to recover', async () => {
    jest.mocked(deleteAccount).mockResolvedValue("We couldn't reach account services." as never);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons
        ?.find((button) => button.text === 'Continue' || button.text === 'Delete forever')
        ?.onPress?.();
    });
    renderSettings();

    fireEvent.press(await screen.findByLabelText('Delete account'));

    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(alert).toHaveBeenLastCalledWith(
        'Account not deleted',
        expect.stringContaining('local session has not been cleared')
      )
    );
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(screen.getByText('miriam@example.com')).toBeTruthy();
    alert.mockRestore();
  });
});
