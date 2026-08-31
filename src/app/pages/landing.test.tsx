import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Landing } from './landing';

vi.mock('../hooks/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../services/supabase-queries', () => ({
  subscribeToWaitlist: vi.fn(),
}));

import { useAuth } from '../hooks/auth-context';
import { subscribeToWaitlist } from '../services/supabase-queries';

describe('Landing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      needsEmailVerification: false,
    });
    vi.mocked(subscribeToWaitlist).mockResolvedValue('subscribed');
  });

  it('renders the hero with branding and call to actions', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    expect(screen.getByText('ORATIO')).toBeInTheDocument();
    expect(screen.getByText('Pray Together. Anywhere.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders the feature cards', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    expect(screen.getByText('Global Prayer Map')).toBeInTheDocument();
    expect(screen.getByText('Pray for One Another')).toBeInTheDocument();
    expect(screen.getByText('Encourage & Connect')).toBeInTheDocument();
  });

  it('renders legal links', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
  });

  it('subscribes to the waitlist and shows confirmation', async () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    await waitFor(() => {
      expect(subscribeToWaitlist).toHaveBeenCalledWith('test@example.com', 'landing');
    });
    expect(screen.getByText("You're on the list! 🙏")).toBeInTheDocument();
  });

  it('shows no confirmation when the subscription fails', async () => {
    vi.mocked(subscribeToWaitlist).mockResolvedValue('error');
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    await waitFor(() => {
      expect(subscribeToWaitlist).toHaveBeenCalled();
    });
    expect(screen.queryByText("You're on the list! 🙏")).toBeNull();
  });

  it('lets users remove themselves from the confirmation state', async () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    await waitFor(() => {
      expect(screen.getByText("You're on the list! 🙏")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Remove'));
    });

    expect(screen.queryByText("You're on the list! 🙏")).toBeNull();
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
  });
});
