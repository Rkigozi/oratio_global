import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from './auth-context';

jest.mock('../services/supabase', () => {
  const qb = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    then: jest.fn((resolve: (v: unknown) => void) => resolve({ data: null, error: null })),
  };

  return {
    supabase: {
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null } as never),
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: { unsubscribe: jest.fn() } },
        })),
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn().mockResolvedValue({ error: null } as never),
        resetPasswordForEmail: jest.fn(),
        startAutoRefresh: jest.fn(),
        stopAutoRefresh: jest.fn(),
      },
      from: () => qb,
    },
  };
});

import { supabase } from '../services/supabase';

function setupSession(session: { user: { id: string } } | null) {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: session as never },
    error: null,
  } as never);
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    } as never);
    setupSession(null);
    const qb = supabase.from('profiles') as unknown as { then: jest.Mock };
    qb.then.mockImplementation((...args: unknown[]) =>
      (args[0] as (value: unknown) => void)({ data: null, error: null })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('finishes loading with no session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('restores a persisted session and fetches the profile', async () => {
    setupSession({ user: { id: 'user-1' } });
    const qb = supabase.from('profiles') as unknown as { then: jest.Mock };
    (qb.then as jest.Mock).mockImplementationOnce((...args: unknown[]) => {
      const resolve = args[0] as (v: unknown) => void;
      resolve({ data: { username: 'testuser', display_name: 'Test User' }, error: null });
      return undefined;
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.user?.id).toBe('user-1'));
    await waitFor(() => expect(result.current.profile?.username).toBe('testuser'));
  });

  it('signs in with email and password', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    } as never);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let error: string | null = 'pending';
    await act(async () => {
      error = await result.current.signIn('test@example.com', 'password123');
    });

    expect(error).toBeNull();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('returns the error message when sign-in fails', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    } as never);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let error: string | null = null;
    await act(async () => {
      error = await result.current.signIn('wrong@test.com', 'wrong');
    });

    expect(error).toBe('Invalid login credentials');
  });

  it('signs up with username metadata', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: {
        user: {
          id: 'new-user',
          email_confirmed_at: new Date().toISOString(),
          identities: [{ id: 'i1' }],
        },
      },
      error: null,
    } as never);

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
    expect(result.current.needsEmailVerification).toBe(false);
  });

  it('flags email verification when signup returns an unconfirmed user', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: { id: 'new-user', email_confirmed_at: null, identities: [] } },
      error: null,
    } as never);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signUp('new@test.com', 'password123', 'newuser');
    });

    expect(result.current.needsEmailVerification).toBe(true);
  });

  it('clears the user on sign-out', async () => {
    setupSession({ user: { id: 'user-1' } });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.user?.id).toBe('user-1'));

    await act(async () => {
      await result.current.signOut();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('requests a password reset email pointing at the web page', async () => {
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
      data: {},
      error: null,
    } as never);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let error: string | null = 'pending';
    await act(async () => {
      error = await result.current.resetPassword('test@example.com');
    });

    expect(error).toBeNull();
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
      redirectTo: 'https://oratiotest.netlify.app/update-password',
    });
  });

  it('ignores a profile response from the account replaced by a newer session', async () => {
    setupSession({ user: { id: 'account-a' } });
    let finishA!: (value: unknown) => void;
    const qb = supabase.from('profiles') as unknown as { then: jest.Mock };
    qb.then.mockImplementationOnce((...args: unknown[]) => {
      finishA = args[0] as (value: unknown) => void;
    });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(finishA).toBeDefined());
    qb.then.mockImplementationOnce((...args: unknown[]) =>
      (args[0] as (value: unknown) => void)({ data: { username: 'account_b' }, error: null })
    );
    await act(async () => {
      void jest
        .mocked(supabase.auth.onAuthStateChange)
        .mock.calls[0][0]('SIGNED_IN', { user: { id: 'account-b' } } as never);
    });
    await waitFor(() => expect(result.current.profile?.username).toBe('account_b'));
    await act(async () => finishA({ data: { username: 'account_a' }, error: null }));
    expect(result.current.user?.id).toBe('account-b');
    expect(result.current.profile?.username).toBe('account_b');
  });

  it('does not repopulate a profile after session expiry', async () => {
    setupSession({ user: { id: 'account-a' } });
    let finish!: (value: unknown) => void;
    const qb = supabase.from('profiles') as unknown as { then: jest.Mock };
    qb.then.mockImplementationOnce((...args: unknown[]) => {
      finish = args[0] as (value: unknown) => void;
    });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(finish).toBeDefined());
    await act(async () => {
      void jest.mocked(supabase.auth.onAuthStateChange).mock.calls[0][0]('SIGNED_OUT', null);
    });
    await act(async () => finish({ data: { username: 'old_account' }, error: null }));
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('ignores a stale initial session restore after a newer auth event', async () => {
    let finish!: (value: never) => void;
    jest.mocked(supabase.auth.getSession).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await act(async () => {
      void jest
        .mocked(supabase.auth.onAuthStateChange)
        .mock.calls[0][0]('SIGNED_IN', { user: { id: 'new-account' } } as never);
    });
    await act(async () =>
      finish({ data: { session: { user: { id: 'old-account' } } }, error: null } as never)
    );
    expect(result.current.user?.id).toBe('new-account');
  });

  it('hides account state immediately while device sign-out is pending', async () => {
    setupSession({ user: { id: 'account-a' } });
    let finish!: (value: never) => void;
    jest.mocked(supabase.auth.signOut).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.user?.id).toBe('account-a'));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.signOut();
    });
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    await act(async () => {
      void jest
        .mocked(supabase.auth.onAuthStateChange)
        .mock.calls[0][0]('TOKEN_REFRESHED', { user: { id: 'account-a' } } as never);
    });
    expect(result.current.user).toBeNull();
    await act(async () => {
      finish({ error: null } as never);
      await pending;
    });
    await act(async () => {
      void jest
        .mocked(supabase.auth.onAuthStateChange)
        .mock.calls[0][0]('TOKEN_REFRESHED', { user: { id: 'account-a' } } as never);
    });
    expect(result.current.user).toBeNull();
    expect(supabase.auth.signOut).toHaveBeenLastCalledWith({ scope: 'local' });
  });

  it('returns a recoverable sign-in error on rejected transport', async () => {
    jest.mocked(supabase.auth.signInWithPassword).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let error: string | null = null;
    await act(async () => {
      error = await result.current.signIn('qa@example.com', 'test');
    });
    expect(error).toMatch(/connection/);
  });
});
