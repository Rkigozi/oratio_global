import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { PrayerRequest } from '../../services/prayer-data';

vi.mock('../../services/supabase-queries', () => ({
  deletePrayerRequest: vi.fn(),
  getMyPrayers: vi.fn(),
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

vi.mock('vaul', () => ({
  Drawer: {
    Root: ({ children }: { children: ReactNode }) => <>{children}</>,
    Portal: ({ children }: { children: ReactNode }) => <>{children}</>,
    Overlay: (props: ComponentProps<'div'>) => <div {...props} />,
    Content: ({ children, ...props }: ComponentProps<'div'>) => <div {...props}>{children}</div>,
    Title: ({ children, ...props }: ComponentProps<'div'>) => <div {...props}>{children}</div>,
    Description: ({ children, ...props }: ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

import { ProfileSubmitted } from './profile-submitted';
import { getMyPrayers } from '../../services/supabase-queries';

const sharedPrayer: PrayerRequest = {
  id: 'shared-1',
  city: 'London',
  country: 'United Kingdom',
  text: 'Please pray for shared courage',
  username: 'qa_miriam',
  displayName: 'Miriam',
  audience: 'public',
  prayerCount: 2,
  lat: 51.5,
  lng: -0.1,
  createdAt: '2024-01-01T00:00:00.000Z',
  commentsEnabled: true,
};

const privatePrayer: PrayerRequest = {
  id: 'private-1',
  city: 'London',
  country: 'United Kingdom',
  text: 'Private testimony note for later',
  username: 'qa_miriam',
  displayName: 'Miriam',
  audience: 'private',
  prayerCount: 0,
  lat: 51.5,
  lng: -0.1,
  createdAt: '2024-01-02T00:00:00.000Z',
  commentsEnabled: true,
};

function renderSubmitted(initialEntry = '/profile/submitted') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/profile/submitted" element={<ProfileSubmitted />} />
        <Route path="/prayer/:id" element={<div>Prayer detail</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProfileSubmitted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMyPrayers).mockResolvedValue([privatePrayer, sharedPrayer]);
  });

  it('shows private prayers in the Only me section without anonymous attribution', async () => {
    renderSubmitted('/profile/submitted?view=private');

    expect(await screen.findByText('Private prayers')).toBeInTheDocument();
    expect(screen.getByText('Private testimony note for later')).toBeInTheDocument();
    expect(screen.queryByText('Please pray for shared courage')).not.toBeInTheDocument();
    expect(screen.getByText('qa_miriam')).toBeInTheDocument();
    expect(screen.queryByText('Anonymous')).not.toBeInTheDocument();
  });

  it('lets users switch between Shared and Only me prayers', async () => {
    renderSubmitted('/profile/submitted?view=private');

    expect(await screen.findByText('Private testimony note for later')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Shared/i }));

    expect(await screen.findByText('Please pray for shared courage')).toBeInTheDocument();
    expect(screen.queryByText('Private testimony note for later')).not.toBeInTheDocument();
  });

  it('opens Only me automatically when the user only has private prayers', async () => {
    vi.mocked(getMyPrayers).mockResolvedValue([privatePrayer]);

    renderSubmitted();

    expect(await screen.findByText('Private prayers')).toBeInTheDocument();
    expect(screen.getByText('Private testimony note for later')).toBeInTheDocument();
  });
});
