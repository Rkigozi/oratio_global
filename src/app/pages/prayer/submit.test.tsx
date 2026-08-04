import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('../../hooks/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../services/supabase-queries', () => ({
  createPrayerRequest: vi.fn(),
  getPrayerCircleCount: vi.fn(),
  getProfilePreferences: vi.fn(),
}));

vi.mock('../../hooks/use-geolocation', () => ({
  useGeolocation: vi.fn(),
}));

vi.mock('../../components/crisis-resources', () => ({
  CrisisResources: () => null,
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: ComponentProps<'div'> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}));

import { Submit } from './submit';
import { useAuth } from '../../hooks/auth-context';
import {
  createPrayerRequest,
  getPrayerCircleCount,
  getProfilePreferences,
} from '../../services/supabase-queries';
import { useGeolocation } from '../../hooks/use-geolocation';

describe('Submit', () => {
  const renderSubmit = async () => {
    const result = render(
      <MemoryRouter>
        <Submit />
      </MemoryRouter>
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    return result;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' } as any,
      profile: { username: 'testuser', display_name: 'Test User' },
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      needsEmailVerification: false,
    });
    vi.mocked(useGeolocation).mockReturnValue({
      location: null,
      loading: false,
      denied: false,
      error: null,
      requestLocation: vi.fn(),
      resetDenied: vi.fn(),
    });
    vi.mocked(getProfilePreferences).mockResolvedValue({
      notify_on_prayed: true,
      notify_on_comment: true,
      language: 'auto',
      comments_enabled_default: true,
      profile_location_mode: 'manual',
    });
    vi.mocked(getPrayerCircleCount).mockResolvedValue(1);
    vi.mocked(createPrayerRequest).mockResolvedValue('prayer-1');
  });

  it('renders textarea, visibility options, public comments toggle, and submit button', async () => {
    await renderSubmit();

    expect(screen.getByPlaceholderText(/share what's on your heart/i)).toBeInTheDocument();
    expect(screen.getByText('Submit Prayer Request')).toBeInTheDocument();
    expect(screen.getByText('Visibility')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getByText('Prayer Circle')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
    expect(screen.getByText('Comments are on')).toBeInTheDocument();
    expect(screen.queryByText(/posting as/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/posting anonymously/i)).not.toBeInTheDocument();
  });

  it('renders location section with auto-detect toggle', async () => {
    await renderSubmit();

    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByLabelText(/auto-detect/i)).toBeInTheDocument();
  });

  it('calls createPrayerRequest on valid submit', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    await renderSubmit();

    fireEvent.change(screen.getByPlaceholderText(/share what's on your heart/i), {
      target: { value: 'Please heal my family and bring peace' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Prayer Request'));
    });

    await vi.waitFor(() => {
      expect(createPrayerRequest).toHaveBeenCalled();
    });

    const callArg = vi.mocked(createPrayerRequest).mock.calls[0][0];
    expect(callArg.text).toContain('Please heal my family');
    expect(callArg.audience).toBe('public');
    expect(callArg.username).toBe('testuser');

    const prayerEvent = dispatchSpy.mock.calls.find(
      ([event]) => event instanceof CustomEvent && event.type === 'oratio-prayer-added'
    )?.[0] as CustomEvent<{ authorId?: string; audience?: string }> | undefined;
    expect(prayerEvent?.detail.authorId).toBe('user-1');
    expect(prayerEvent?.detail.audience).toBe('public');

    await vi.waitFor(() => {
      expect(screen.getByText('Prayer Request Submitted')).toBeInTheDocument();
    });

    dispatchSpy.mockRestore();
  });

  it('submits to Prayer Circle when selected', async () => {
    await renderSubmit();

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: /Prayer Circle/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: /Prayer Circle/i }));
    fireEvent.change(screen.getByPlaceholderText(/share what's on your heart/i), {
      target: { value: 'Please pray with me through this quiet season' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Prayer Request'));
    });

    await vi.waitFor(() => {
      expect(createPrayerRequest).toHaveBeenCalled();
    });

    const callArg = vi.mocked(createPrayerRequest).mock.calls[0][0];
    expect(callArg.audience).toBe('circle');
    expect(callArg.username).toBe('testuser');
    expect(callArg.commentsEnabled).toBe(true);
    expect(screen.queryByText('Comments are on')).not.toBeInTheDocument();

    await vi.waitFor(() => {
      expect(screen.getByText('View Prayer Circle')).toBeInTheDocument();
    });
    expect(screen.queryByText('Share prayer link')).not.toBeInTheDocument();
  });

  it('submits private prayers', async () => {
    await renderSubmit();

    fireEvent.click(screen.getByRole('button', { name: /Private/i }));
    fireEvent.change(screen.getByPlaceholderText(/share what's on your heart/i), {
      target: { value: 'A private prayer note' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Prayer Request'));
    });

    await vi.waitFor(() => {
      expect(createPrayerRequest).toHaveBeenCalled();
    });

    const callArg = vi.mocked(createPrayerRequest).mock.calls[0][0];
    expect(callArg.audience).toBe('private');
    expect(callArg.username).toBe('testuser');
    expect(callArg.commentsEnabled).toBe(true);
    expect(screen.queryByText('Comments are on')).not.toBeInTheDocument();

    await vi.waitFor(() => {
      expect(screen.getByText('Open Private Prayer')).toBeInTheDocument();
    });
    expect(screen.queryByText('Share prayer link')).not.toBeInTheDocument();
  });

  it('disables Prayer Circle when there are no Circle members', async () => {
    vi.mocked(getPrayerCircleCount).mockResolvedValueOnce(0);

    await renderSubmit();

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: /Prayer Circle/i })).toBeDisabled();
    });
    expect(
      screen.getByText(/Prayer Circle opens once someone accepts your invite/i)
    ).toBeInTheDocument();
  });

  it('shows validation error when prayer text is too short', async () => {
    await renderSubmit();

    fireEvent.change(screen.getByPlaceholderText(/share what's on your heart/i), {
      target: { value: 'Short' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Prayer Request'));
    });

    await vi.waitFor(() => {
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });

    expect(createPrayerRequest).not.toHaveBeenCalled();
  });

  it('shows success message after submission', async () => {
    await renderSubmit();

    fireEvent.change(screen.getByPlaceholderText(/share what's on your heart/i), {
      target: { value: 'Please heal my family and bring peace to us all' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Prayer Request'));
    });

    await vi.waitFor(() => {
      expect(screen.getByText('Prayer Request Submitted')).toBeInTheDocument();
    });

    expect(screen.getByText('View in Feed')).toBeInTheDocument();
    expect(screen.getByText('Submit Another Request')).toBeInTheDocument();
  });

  it('shows an error instead of success when saving fails', async () => {
    vi.mocked(createPrayerRequest).mockResolvedValueOnce(null);

    await renderSubmit();

    fireEvent.change(screen.getByPlaceholderText(/share what's on your heart/i), {
      target: { value: 'Please heal my family and bring peace to us all' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Prayer Request'));
    });

    await vi.waitFor(() => {
      expect(screen.getByText(/couldn't save this prayer/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('Prayer Request Submitted')).not.toBeInTheDocument();
  });

  it('uses approximate coordinates for manually entered locations', async () => {
    await renderSubmit();

    fireEvent.click(screen.getByLabelText(/auto-detect/i));
    fireEvent.change(screen.getByPlaceholderText('City'), {
      target: { value: 'London' },
    });
    fireEvent.change(screen.getByDisplayValue('Country'), {
      target: { value: 'United Kingdom' },
    });
    fireEvent.change(screen.getByPlaceholderText(/share what's on your heart/i), {
      target: { value: 'Please heal my family and bring peace to us all' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Prayer Request'));
    });

    await vi.waitFor(() => {
      expect(createPrayerRequest).toHaveBeenCalled();
    });

    const callArg = vi.mocked(createPrayerRequest).mock.calls[0][0];
    expect(callArg.city).toBe('London');
    expect(callArg.country).toBe('United Kingdom');
    expect(callArg.lat).not.toBe(0);
    expect(callArg.lng).not.toBe(0);
  });

  it('allows comments to be turned off for public prayers', async () => {
    await renderSubmit();

    expect(screen.getByText('Comments are on')).toBeInTheDocument();

    const section = screen.getByText('Comments are on').closest('div')!.parentElement!;
    const toggle = section.querySelector('button')!;
    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(screen.getByText('Comments are off')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/share what's on your heart/i), {
      target: { value: 'Please pray for a public request without comments' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Prayer Request'));
    });

    await vi.waitFor(() => {
      expect(createPrayerRequest).toHaveBeenCalled();
    });

    expect(vi.mocked(createPrayerRequest).mock.calls[0][0].commentsEnabled).toBe(false);
  });
});
