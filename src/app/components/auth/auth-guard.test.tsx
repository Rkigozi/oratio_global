import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { AuthGuard } from './auth-guard';

vi.mock('../../hooks/auth-context', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../hooks/auth-context';

describe('AuthGuard', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      profile: null,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      needsEmailVerification: false,
    });
  });

  it('renders outlet when authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route index element={<div>Authenticated Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Authenticated Content')).toBeTruthy();
  });

  it('redirects to login with a safe return path when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      profile: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      needsEmailVerification: false,
    });

    render(
      <MemoryRouter initialEntries={['/prayer/p1?from=share']}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/prayer/:id" element={<div>Protected</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Login Page')).toBeTruthy();
  });

  it('redirects the logged-out app root to landing instead of login', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      profile: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      needsEmailVerification: false,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route index element={<div>Protected Root</div>} />
          </Route>
          <Route path="/landing" element={<div>Landing Page</div>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Landing Page')).toBeTruthy();
  });

  it('shows landing immediately on root while auth loads', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      profile: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      needsEmailVerification: false,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthGuard />
      </MemoryRouter>
    );

    expect(screen.getByText('ORATIO')).toBeTruthy();
  });

  it('keeps the loader on root while an existing session is restored', () => {
    vi.useFakeTimers();
    localStorage.setItem('sb-test-auth-token', '{}');
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      profile: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      needsEmailVerification: false,
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <AuthGuard />
      </MemoryRouter>
    );

    expect(screen.queryByText('ORATIO')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(180);
    });

    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows loading spinner while auth loads on protected non-root routes', () => {
    vi.useFakeTimers();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      profile: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      needsEmailVerification: false,
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/feed']}>
        <AuthGuard />
      </MemoryRouter>
    );

    expect(container.querySelector('.animate-spin')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(180);
    });

    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });
});
