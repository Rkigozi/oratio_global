import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { UpdatePassword } from './update-password';

vi.mock('../../hooks/auth-context', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../hooks/auth-context';

function mockAuth(user: { id: string } | null) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    profile: null,
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn().mockResolvedValue(null),
    needsEmailVerification: false,
  });
}

describe('UpdatePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a verification state while waiting for the session', () => {
    mockAuth(null);
    render(
      <MemoryRouter>
        <UpdatePassword />
      </MemoryRouter>
    );
    expect(screen.getByText('Verifying your reset link...')).toBeInTheDocument();
  });

  it('shows an expired-link state after the session check times out', async () => {
    mockAuth(null);
    render(
      <MemoryRouter>
        <UpdatePassword />
      </MemoryRouter>
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByText('Invalid or Expired Link')).toBeInTheDocument();
    expect(screen.getByText('Request New Link')).toBeInTheDocument();
  });

  it('renders the password form for an authenticated user', () => {
    mockAuth({ id: 'user-1' });
    render(
      <MemoryRouter>
        <UpdatePassword />
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText('New password (6+ characters)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm new password')).toBeInTheDocument();
    expect(screen.getByText('Update Password')).toBeInTheDocument();
  });

  it('rejects short passwords', async () => {
    mockAuth({ id: 'user-1' });
    render(
      <MemoryRouter>
        <UpdatePassword />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('New password (6+ characters)'), {
      target: { value: 'abc' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
      target: { value: 'abc' },
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Update Password'));
    });
    expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
  });

  it('rejects mismatched passwords', async () => {
    mockAuth({ id: 'user-1' });
    render(
      <MemoryRouter>
        <UpdatePassword />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('New password (6+ characters)'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
      target: { value: 'different456' },
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Update Password'));
    });
    expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
  });

  it('shows the success state after a successful update', async () => {
    mockAuth({ id: 'user-1' });
    render(
      <MemoryRouter>
        <UpdatePassword />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('New password (6+ characters)'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
      target: { value: 'password123' },
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Update Password'));
    });
    expect(screen.getByText('Password Updated')).toBeInTheDocument();
  });

  it('shows an error returned by updatePassword', async () => {
    mockAuth({ id: 'user-1' });
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      profile: null,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn().mockResolvedValue('Something went wrong'),
      needsEmailVerification: false,
    });
    render(
      <MemoryRouter>
        <UpdatePassword />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('New password (6+ characters)'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
      target: { value: 'password123' },
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Update Password'));
    });
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('navigates to reset-password from the expired state', async () => {
    mockAuth(null);
    render(
      <MemoryRouter initialEntries={['/update-password']}>
        <Routes>
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/reset-password" element={<div>Reset page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Request New Link'));
    });

    expect(screen.getByText('Reset page')).toBeInTheDocument();
  });
});
