import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth-context';

vi.mock('../../lib/analytics', () => ({
  captureEvent: vi.fn(),
}));

vi.mock('../services/supabase', () => {
  const authFns: Record<string, ReturnType<typeof vi.fn>> = {
    getUser: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  };

  const qb = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (value: unknown) => void) => {
      resolve({ data: null, error: null });
    }),
  };

  return {
    supabase: {
      auth: authFns,
      from: () => qb,
      rpc: vi.fn(),
      functions: { invoke: vi.fn() },
    },
  };
});

import { supabase } from '../services/supabase';
import { captureEvent } from '../../lib/analytics';

function getQb(): Record<string, ReturnType<typeof vi.fn>> {
  return (supabase as { from: () => Record<string, ReturnType<typeof vi.fn>> }).from('x');
}

function setupDefaults() {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
  vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  vi.mocked(supabase.auth.signUp).mockResolvedValue({
    data: { user: { id: 'new-user', email_confirmed_at: null, identities: [{ id: 'i1' }] } },
    error: null,
  });
  vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  });
  vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
    data: { url: 'https://accounts.google.com/o/oauth2/auth' },
    error: null,
  });
  vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });
  vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {}, error: null });
  vi.mocked(supabase.auth.updateUser).mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  });
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user: { id: 'test-user-id' } },
    error: null,
  });

  const qb = getQb();
  for (const key of [
    'select',
    'eq',
    'order',
    'limit',
    'single',
    'insert',
    'delete',
    'in',
    'not',
    'ilike',
    'maybeSingle',
    'update',
  ]) {
    qb[key] = vi.fn().mockReturnThis();
  }
  qb.then = vi.fn((resolve: (value: unknown) => void) => {
    resolve({ data: null, error: null });
  });
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows loading state initially', () => {
    vi.mocked(supabase.auth.getSession).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.loading).toBe(true);
  });

  it('stops loading when session restoration stalls', async () => {
    vi.useFakeTimers();
    vi.mocked(supabase.auth.getSession).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('sets user and profile after successful session load', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'test@example.com' } } },
      error: null,
    });

    const qb = getQb();
    qb.then = vi.fn((resolve: (value: unknown) => void) => {
      resolve({ data: { username: 'testuser', display_name: 'Test User' }, error: null });
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.profile?.username).toBe('testuser');
    });
  });

  it('handles null session gracefully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('handles getSession error gracefully', async () => {
    vi.mocked(supabase.auth.getSession).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it('signUp returns null on success', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let error: string | null = 'pending';
    await act(async () => {
      error = await result.current.signUp('new@test.com', 'password123', 'newuser');
    });

    expect(error).toBeNull();
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@test.com',
      password: 'password123',
      options: { data: { username: 'newuser' } },
    });
  });

  it('signUp returns error message on failure', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null },
      error: { message: 'User already exists' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let error: string | null = null;
    await act(async () => {
      error = await result.current.signUp('existing@test.com', 'password123', 'existing');
    });

    expect(error).toBe('User already exists');
  });

  it('sets needsEmailVerification when email not confirmed', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: { id: 'u1', email_confirmed_at: null, identities: [] } },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signUp('new@test.com', 'password123', 'newuser');
    });

    expect(result.current.needsEmailVerification).toBe(true);
  });

  it('signIn returns null on success', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let error: string | null = 'pending';
    await act(async () => {
      error = await result.current.signIn('test@example.com', 'password');
    });

    expect(error).toBeNull();
  });

  it('signIn returns error on failure', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let error: string | null = null;
    await act(async () => {
      error = await result.current.signIn('wrong@test.com', 'wrong');
    });

    expect(error).toBe('Invalid login credentials');
  });

  it('signOut clears user and profile', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'test@example.com' } } },
      error: null,
    });

    const qb = getQb();
    qb.then = vi.fn((resolve: (value: unknown) => void) => {
      resolve({ data: { username: 'testuser', display_name: 'Test User' }, error: null });
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).not.toBeNull();

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(captureEvent).toHaveBeenCalledWith('user_signed_out');
  });

  it('resetPassword returns null on success', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let error: string | null = 'pending';
    await act(async () => {
      error = await result.current.resetPassword('test@example.com');
    });

    expect(error).toBeNull();
    expect(captureEvent).toHaveBeenCalledWith('password_reset_requested');
  });

  it('updatePassword returns null on success', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let error: string | null = 'pending';
    await act(async () => {
      error = await result.current.updatePassword('newpassword');
    });

    expect(error).toBeNull();
    expect(captureEvent).toHaveBeenCalledWith('password_updated');
  });

  it('subscribes to auth state changes', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(supabase.auth.onAuthStateChange).toHaveBeenCalled());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('unsubscribes on unmount', async () => {
    const unsubscribe = vi.fn();
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe } },
    });

    const { unmount } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(supabase.auth.onAuthStateChange).toHaveBeenCalled());

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
