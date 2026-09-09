import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { Profile } from './profile';

vi.mock('../../hooks/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/use-geolocation', () => ({
  useGeolocation: vi.fn(),
}));

vi.mock('../../hooks/activity-updates-context', () => ({
  useActivityUpdates: vi.fn(),
}));

vi.mock('../../services/upload', () => ({
  uploadAvatar: vi.fn(),
}));

vi.mock('../../services/supabase-queries', () => ({
  getPrayerCircleCount: vi.fn(),
  getProfilePreferences: vi.fn(),
  updateProfile: vi.fn(),
  updateProfilePreferences: vi.fn(),
  getMyProfile: vi.fn(),
  getMyPrayers: vi.fn(),
  getMyPrayedForPrayers: vi.fn(),
  getMySavedIds: vi.fn(),
}));

vi.mock('vaul', () => {
  const passthrough = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    Drawer: {
      Root: ({ open, children }: { open?: boolean; children?: ReactNode }) =>
        open ? <div data-testid="drawer-root">{children}</div> : null,
      Portal: passthrough,
      Overlay: () => null,
      Content: passthrough,
      Title: passthrough,
      Description: passthrough,
    },
  };
});

import { useAuth } from '../../hooks/auth-context';
import { useGeolocation } from '../../hooks/use-geolocation';
import { useActivityUpdates } from '../../hooks/activity-updates-context';
import {
  getMyProfile,
  getMyPrayers,
  getMyPrayedForPrayers,
  getMySavedIds,
  getPrayerCircleCount,
  getProfilePreferences,
  updateProfile,
  updateProfilePreferences,
} from '../../services/supabase-queries';
import type { PrayerRequest } from '../../services/prayer-data';

const profile = {
  id: 'user-1',
  username: 'testuser',
  display_name: 'Test User',
  avatar_url: null,
  bio: 'Praying for the world',
  location: 'London, UK',
  created_at: new Date().toISOString(),
};

function prayer(overrides: Partial<PrayerRequest>): PrayerRequest {
  return {
    id: 'p1',
    city: 'London',
    country: 'United Kingdom',
    text: 'Prayer text',
    username: 'testuser',
    prayerCount: 1,
    lat: 51.5,
    lng: -0.1,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function setupProfile() {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'user-1' },
    profile: { username: 'testuser', display_name: 'Test User' },
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    needsEmailVerification: false,
  });
  vi.mocked(useGeolocation).mockReturnValue({
    location: null,
    loading: false,
    denied: false,
    error: null,
    requestLocation: vi.fn().mockResolvedValue(null),
    resetDenied: vi.fn(),
  });
  vi.mocked(useActivityUpdates).mockReturnValue({
    unreadCount: 0,
    liveVersion: 0,
    refreshUnreadCount: vi.fn(),
  });
  vi.mocked(getMyProfile).mockResolvedValue(profile);
  vi.mocked(getMyPrayers).mockResolvedValue([
    prayer({ id: 'p-pub', audience: 'public' }),
    prayer({ id: 'p-cir', audience: 'circle' }),
    prayer({ id: 'p-prv', audience: 'private' }),
  ]);
  vi.mocked(getMyPrayedForPrayers).mockResolvedValue([prayer({ id: 'p-prayed' })]);
  vi.mocked(getMySavedIds).mockResolvedValue(['saved-1', 'saved-2']);
  vi.mocked(getPrayerCircleCount).mockResolvedValue(1);
  vi.mocked(getProfilePreferences).mockResolvedValue({
    notify_on_prayed: true,
    notify_on_comment: true,
    language: 'auto',
    comments_enabled_default: true,
    profile_location_mode: 'manual',
  });
  vi.mocked(updateProfile).mockResolvedValue(true);
  vi.mocked(updateProfilePreferences).mockResolvedValue(true);
}

function renderProfile() {
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<Profile />} />
        <Route path="/landing" element={<div>Landing stub</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupProfile();
  });

  it('renders the profile header with username, bio, and location', async () => {
    renderProfile();

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
    expect(screen.getByText('@testuser')).toBeInTheDocument();
    expect(screen.getByText('Praying for the world')).toBeInTheDocument();
    expect(screen.getByText('📍 London, UK')).toBeInTheDocument();
  });

  it('shows prayer library counts split by audience', async () => {
    renderProfile();

    await waitFor(() => {
      expect(screen.getByText('1 shared on the public feed.')).toBeInTheDocument();
    });
    expect(screen.getByText('1 shared with your Prayer Circle.')).toBeInTheDocument();
    expect(screen.getByText('1 kept just for you.')).toBeInTheDocument();
  });

  it('shows activity counts for prayed and saved prayers', async () => {
    renderProfile();

    await waitFor(() => {
      expect(screen.getByText('1 prayer you marked.')).toBeInTheDocument();
    });
    expect(screen.getByText('2 prayers saved for later.')).toBeInTheDocument();
  });

  it('shows the Prayer Circle capacity', async () => {
    renderProfile();

    await waitFor(() => {
      expect(screen.getByText('1 of 12 spaces filled.')).toBeInTheDocument();
    });
  });

  it('opens the edit drawer prefilled with the current username', async () => {
    renderProfile();

    await waitFor(() => {
      expect(screen.getByText('@testuser')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));

    const usernameInput = await screen.findByDisplayValue('testuser');
    expect(usernameInput).toBeInTheDocument();
  });

  it('saves profile changes with a lowercased username', async () => {
    renderProfile();

    await waitFor(() => {
      expect(screen.getByText('@testuser')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));

    const usernameInput = await screen.findByDisplayValue('testuser');
    fireEvent.change(usernameInput, { target: { value: 'NewName' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    });

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'newname' })
      );
    });
    expect(updateProfilePreferences).toHaveBeenCalledWith({
      profile_location_mode: 'manual',
    });
  });

  it('shows an error when saving fails', async () => {
    vi.mocked(updateProfile).mockResolvedValue(false);
    renderProfile();

    await waitFor(() => {
      expect(screen.getByText('@testuser')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));

    await screen.findByDisplayValue('testuser');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    });

    await waitFor(() => {
      expect(
        screen.getByText("We couldn't save your changes. The username may already be taken.")
      ).toBeInTheDocument();
    });
  });

  it('signs out and navigates to the landing page', async () => {
    renderProfile();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    });

    await waitFor(() => {
      expect(screen.getByText('Landing stub')).toBeInTheDocument();
    });
  });

  it('renders navigation targets for the profile sections', async () => {
    renderProfile();

    await waitFor(() => {
      expect(screen.getByText('Manage Prayer Circle')).toBeInTheDocument();
    });
    expect(screen.getByText('Updates')).toBeInTheDocument();
    expect(screen.getByText('Prayed for')).toBeInTheDocument();
    expect(screen.getByText('Saved prayers')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'About' })).toBeTruthy();
  });
});
