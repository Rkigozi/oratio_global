import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

vi.mock('../../hooks/auth-context', () => ({
  useAuth: () => ({ profile: { username: 'current_name', display_name: 'Current Name' } }),
}));

vi.mock('../../services/supabase-queries', () => ({
  getProfileByUsername: vi.fn(),
  getUserPrayers: vi.fn(),
  getPrayerCircleStatus: vi.fn(),
  respondToPrayerCircleInvite: vi.fn(),
  sendPrayerCircleInvite: vi.fn(),
  cancelPrayerCircleInvite: vi.fn(),
  togglePray: vi.fn(),
}));

import { UserProfile } from './user-profile';
import {
  getPrayerCircleStatus,
  getProfileByUsername,
  getUserPrayers,
} from '../../services/supabase-queries';

function CurrentPath() {
  return <output data-testid="current-path">{useLocation().pathname}</output>;
}

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProfileByUsername).mockResolvedValue({
      id: 'user-1',
      username: 'current_name',
      display_name: 'Current Name',
      avatar_url: null,
      created_at: '2024-01-01T00:00:00.000Z',
    });
    vi.mocked(getUserPrayers).mockResolvedValue([]);
    vi.mocked(getPrayerCircleStatus).mockResolvedValue({ state: 'none' });
  });

  it('redirects an old username route to the current username', async () => {
    render(
      <MemoryRouter initialEntries={['/user/old_name']}>
        <CurrentPath />
        <Routes>
          <Route path="/user/:name" element={<UserProfile />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent('/user/current_name');
    });
    expect(await screen.findByText('@current_name')).toBeInTheDocument();
    expect(getProfileByUsername).toHaveBeenCalledWith('old_name');
  });
});
