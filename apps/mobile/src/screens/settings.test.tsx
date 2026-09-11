import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SettingsScreen } from './settings';

const navigation = { goBack: jest.fn() };
const mockSignOut = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  Bell: () => null,
  Globe2: () => null,
  LogOut: () => null,
  MessageCircle: () => null,
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

jest.mock('@oratio/shared/queries', () => ({
  getProfilePreferences: jest.fn(),
  updateProfilePreferences: jest.fn(),
}));

import { getProfilePreferences, updateProfilePreferences } from '@oratio/shared/queries';

const preferences = {
  notify_on_prayed: true,
  notify_on_comment: true,
  language: 'auto',
  comments_enabled_default: true,
  profile_location_mode: 'manual',
};

function renderSettings() {
  return render(<SettingsScreen navigation={navigation as never} route={{} as never} />);
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getProfilePreferences).mockResolvedValue(preferences as never);
    jest.mocked(updateProfilePreferences).mockResolvedValue(true as never);
  });

  it('loads profile preferences', async () => {
    renderSettings();

    expect(await screen.findByText('Prayers offered')).toBeTruthy();
    expect(screen.getByText('Comments and replies')).toBeTruthy();
    expect(screen.getByText('Allow comments on new public prayers')).toBeTruthy();
    expect(screen.getByText('miriam@example.com')).toBeTruthy();
  });

  it('updates toggle preferences optimistically', async () => {
    renderSettings();

    fireEvent(await screen.findByLabelText('Prayers offered'), 'valueChange', false);

    await waitFor(() =>
      expect(updateProfilePreferences).toHaveBeenCalledWith({ notify_on_prayed: false })
    );
  });

  it('updates translation language', async () => {
    renderSettings();

    fireEvent.press(await screen.findByText('Spanish'));

    await waitFor(() => expect(updateProfilePreferences).toHaveBeenCalledWith({ language: 'es' }));
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
});
