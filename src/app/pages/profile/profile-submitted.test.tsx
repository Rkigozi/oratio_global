import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
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
  text: 'Private prayer note for later',
  username: 'qa_miriam',
  displayName: 'Miriam',
  audience: 'private',
  prayerCount: 0,
  lat: 51.5,
  lng: -0.1,
  createdAt: '2024-01-02T00:00:00.000Z',
  commentsEnabled: true,
};

const circlePrayer: PrayerRequest = {
  id: 'circle-1',
  city: 'Lagos',
  country: 'Nigeria',
  text: 'Prayer Circle encouragement for the week',
  username: 'qa_miriam',
  displayName: 'Miriam',
  audience: 'circle',
  prayerCount: 1,
  lat: 6.5,
  lng: 3.3,
  createdAt: '2024-01-03T00:00:00.000Z',
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
    vi.mocked(getMyPrayers).mockResolvedValue([privatePrayer, circlePrayer, sharedPrayer]);
  });

  it('shows private prayers as a dedicated list without anonymous attribution', async () => {
    renderSubmitted('/profile/submitted?view=private');

    expect(await screen.findByText('Private prayers')).toBeInTheDocument();
    expect(screen.getByText('Private prayer note for later')).toBeInTheDocument();
    expect(screen.queryByText('Please pray for shared courage')).not.toBeInTheDocument();
    expect(screen.queryByText('Prayer Circle encouragement for the week')).not.toBeInTheDocument();
    expect(screen.getByText('qa_miriam')).toBeInTheDocument();
    expect(screen.queryByText('Anonymous')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Shared/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Only me/i })).not.toBeInTheDocument();
  });

  it('shows public prayers as a dedicated list by default', async () => {
    renderSubmitted();

    expect(await screen.findByText('Please pray for shared courage')).toBeInTheDocument();
    expect(screen.queryByText('Private prayer note for later')).not.toBeInTheDocument();
    expect(screen.queryByText('Prayer Circle encouragement for the week')).not.toBeInTheDocument();
  });

  it('shows Prayer Circle prayers as a dedicated list', async () => {
    renderSubmitted('/profile/submitted?view=circle');

    expect(await screen.findByText('Prayer Circle prayers')).toBeInTheDocument();
    expect(screen.getByText('Prayer Circle encouragement for the week')).toBeInTheDocument();
    expect(screen.queryByText('Private prayer note for later')).not.toBeInTheDocument();
    expect(screen.queryByText('Please pray for shared courage')).not.toBeInTheDocument();
  });
});
