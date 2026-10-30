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
      expect(updateProfile).toHaveBeenCalledWith(
        {
          username: 'new_name',
          display_name: 'New Name',
          bio: 'Still praying',
          location: 'Kampala',
        },
        expect.objectContaining({
          expectedUserId: 'user-1',
          expectedValues: expect.objectContaining({ username: profile.username, bio: profile.bio }),
        })
      )
    );
    expect(mockRefreshProfile).toHaveBeenCalled();
  });

  it('uploads a selected avatar and saves its public URL', async () => {
    renderProfile();

    fireEvent.press(await screen.findByLabelText('Change profile photo'));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith(
        {
          avatar_url: 'https://cdn.oratio/avatar.jpg',
        },
        expect.objectContaining({ expectedUserId: 'user-1', expectedValues: { avatar_url: null } })
      )
    );
    expect(mockRefreshProfile).toHaveBeenCalled();
  });

  it('opens settings from the profile header', async () => {
    renderProfile();

    fireEvent.press(await screen.findByLabelText('Open settings'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Settings');
  });

  it('keeps an uncertain profile draft and verifies the original values before retrying', async () => {
    jest.mocked(updateProfile).mockRejectedValueOnce(new Error('lost confirmation'));
    renderProfile();
    fireEvent.press(await screen.findByLabelText('Edit profile'));
    fireEvent.changeText(screen.getByDisplayValue('Praying daily'), 'Keep this draft');
    fireEvent.press(screen.getByLabelText('Save profile'));
    const retry = await screen.findByText('Check and retry');
    expect(screen.getByDisplayValue('Keep this draft').props.editable).toBe(false);
    expect(screen.getByLabelText('Save profile')).toBeDisabled();
    fireEvent.press(retry);
    await waitFor(() => expect(screen.queryByText('Check and retry')).toBeNull());
    expect((await screen.findAllByText('Keep this draft')).length).toBeGreaterThan(0);
    const calls = jest.mocked(updateProfile).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual([
      calls[0][0],
      expect.objectContaining({
        requestId: calls[0][1]?.requestId,
        expectedValues: calls[0][1]?.expectedValues,
        verifyExisting: true,
      }),
    ]);
  });

  it('retries a photo profile update without reopening the picker or uploading again', async () => {
    jest.mocked(updateProfile).mockRejectedValueOnce(new Error('lost confirmation'));
    renderProfile();
    fireEvent.press(await screen.findByLabelText('Change profile photo'));
    fireEvent.press(await screen.findByText('Check and retry'));
    await waitFor(() => expect(screen.queryByText('Check and retry')).toBeNull());
    expect(chooseAndUploadAvatar).toHaveBeenCalledTimes(1);
    expect(chooseAndUploadAvatar).toHaveBeenCalledWith('user-1');
    expect(updateProfile).toHaveBeenCalledTimes(2);
    expect(jest.mocked(updateProfile).mock.calls[1][0]).toEqual({
      avatar_url: 'https://cdn.oratio/avatar.jpg',
    });
  });

  it('offers profile retry without replacing a failed read with editable defaults', async () => {
    jest.mocked(getMyProfile).mockRejectedValueOnce(new Error('offline'));
    renderProfile();
    const retry = await screen.findByText('Refresh profile');
    expect(screen.getByLabelText('Edit profile')).toBeDisabled();
    fireEvent.press(retry);
    await waitFor(() => expect(screen.getByLabelText('Edit profile')).toBeEnabled());
    expect(screen.getAllByText('@testuser').length).toBeGreaterThan(0);
  });

  it('opens the owned prayer library from the Profile actions', async () => {
    renderProfile();

    fireEvent.press(await screen.findByText('My Prayers'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('MyPrayers');
  });

  it('opens a filtered owned prayer library from each prayer count', async () => {
    renderProfile();

    fireEvent.press(await screen.findByLabelText('View my circle prayers'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('MyPrayers', {
      initialAudience: 'circle',
    });
  });
});
