import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ProfileScreen } from './profile';

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };
const mockRefreshProfile = jest.fn<() => Promise<unknown>>().mockResolvedValue(null);

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  Camera: () => null,
  Check: () => null,
  Settings: () => null,
  X: () => null,
}));

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useNavigation: () => ({
      ...mockNavigation,
      canGoBack: () => false,
    }),
    useFocusEffect: (callback: () => void | (() => void)) => {
      useEffect(callback, [callback]);
    },
  };
});

jest.mock('../hooks/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'miriam@example.com' },
    profile: { username: 'testuser', display_name: 'Test User' },
    refreshProfile: mockRefreshProfile,
  }),
}));

jest.mock('../services/avatar-upload', () => ({
  chooseAndUploadAvatar: jest.fn(),
}));

jest.mock('@oratio/shared/queries', () => ({
  getMyProfile: jest.fn(),
  getMyPrayers: jest.fn(),
  updateProfile: jest.fn(),
}));

import { chooseAndUploadAvatar } from '../services/avatar-upload';
import { getMyProfile, getMyPrayers, updateProfile } from '@oratio/shared/queries';

const profile = {
  id: 'user-1',
  username: 'testuser',
  display_name: 'Test User',
  avatar_url: null,
  bio: 'Praying daily',
  location: 'London',
  created_at: '2026-09-01T00:00:00.000Z',
};

function renderProfile() {
  return render(<ProfileScreen />);
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshProfile.mockResolvedValue(null);
    jest.mocked(getMyProfile).mockResolvedValue(profile as never);
    jest.mocked(getMyPrayers).mockImplementation((audience) => {
      if (audience === 'public') return Promise.resolve([{}] as never);
      if (audience === 'circle') return Promise.resolve([{}, {}] as never);
      return Promise.resolve([] as never);
    });
    jest.mocked(updateProfile).mockResolvedValue(true as never);
    jest.mocked(chooseAndUploadAvatar).mockResolvedValue({
      status: 'uploaded',
      url: 'https://cdn.oratio/avatar.jpg',
    } as never);
  });

  it('loads profile details and prayer counts', async () => {
    renderProfile();

    await screen.findByText('Profile');
    expect(screen.getAllByText('Test User').length).toBeGreaterThan(0);
    expect(screen.getAllByText('@testuser').length).toBeGreaterThan(0);
    expect(screen.queryByText('miriam@example.com')).toBeNull();
    expect(screen.getAllByText('Praying daily').length).toBeGreaterThan(0);
    expect(screen.getAllByText('London').length).toBeGreaterThan(0);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('saves edited profile fields through the shared query', async () => {
    renderProfile();

    fireEvent.press(await screen.findByLabelText('Edit profile'));
    fireEvent.changeText(screen.getByDisplayValue('testuser'), 'new_name');
    fireEvent.changeText(screen.getByDisplayValue('Test User'), 'New Name');
    fireEvent.changeText(screen.getByDisplayValue('Praying daily'), 'Still praying');
    fireEvent.changeText(screen.getByDisplayValue('London'), 'Kampala');
    fireEvent.press(screen.getByLabelText('Save profile'));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        username: 'new_name',
        display_name: 'New Name',
        bio: 'Still praying',
        location: 'Kampala',
      })
    );
    expect(mockRefreshProfile).toHaveBeenCalled();
  });

  it('uploads a selected avatar and saves its public URL', async () => {
    renderProfile();

    fireEvent.press(await screen.findByLabelText('Change profile photo'));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        avatar_url: 'https://cdn.oratio/avatar.jpg',
      })
    );
    expect(mockRefreshProfile).toHaveBeenCalled();
  });

  it('opens settings from the profile header', async () => {
    renderProfile();

    fireEvent.press(await screen.findByLabelText('Open settings'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Settings');
  });
});
