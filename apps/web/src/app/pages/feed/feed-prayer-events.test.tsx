import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { PrayerRequest } from '../../services/prayer-data';

vi.mock('../../hooks/use-geolocation', () => ({
  useGeolocation: vi.fn(),
}));

vi.mock('../../services/supabase-queries', () => ({
  getFeedPrayers: vi.fn(),
  getMyPrayedIds: vi.fn(),
  getMySavedIds: vi.fn(),
  getPrayerCircleMemberIds: vi.fn(),
  searchUsers: vi.fn(),
  togglePray: vi.fn(),
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

import { Feed } from './feed';
import { useGeolocation } from '../../hooks/use-geolocation';
import {
  getFeedPrayers,
  getMyPrayedIds,
  getMySavedIds,
  getPrayerCircleMemberIds,
  searchUsers,
} from '../../services/supabase-queries';

const basePrayers: PrayerRequest[] = [
  {
    id: 'p1',
    city: 'London',
    country: 'United Kingdom',
    text: 'Pray for patience today',
    username: 'miriam',
    prayerCount: 3,
    lat: 51.5,
    lng: -0.1,
    createdAt: new Date().toISOString(),
    commentsEnabled: true,
  },
];

function setupFeed() {
  vi.mocked(useGeolocation).mockReturnValue({
    location: null,
    loading: false,
    denied: false,
    error: null,
    requestLocation: vi.fn(),
    resetDenied: vi.fn(),
  });
  vi.mocked(getFeedPrayers).mockResolvedValue(basePrayers);
  vi.mocked(getPrayerCircleMemberIds).mockResolvedValue([]);
  vi.mocked(getMyPrayedIds).mockResolvedValue([]);
  vi.mocked(getMySavedIds).mockResolvedValue([]);
  vi.mocked(searchUsers).mockResolvedValue([]);

  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
}

function renderFeed() {
  render(
    <MemoryRouter initialEntries={['/feed']}>
      <Feed />
    </MemoryRouter>
  );
}

describe('Feed prayer event integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.setItem('oratio_feed_visited', 'true');
    setupFeed();
  });

  it('prepends a prayer when the submit page dispatches oratio-prayer-added', async () => {
    renderFeed();
    await screen.findByText('Pray for patience today');

    const newPrayer: PrayerRequest = {
      id: 'p-new',
      city: 'Nairobi',
      country: 'Kenya',
      text: 'A freshly submitted prayer request',
      username: 'newuser',
      prayerCount: 0,
      lat: -1.29,
      lng: 36.82,
      createdAt: new Date().toISOString(),
      commentsEnabled: true,
    };

    await act(async () => {
      window.dispatchEvent(new CustomEvent('oratio-prayer-added', { detail: newPrayer }));
    });

    expect(screen.getByText('A freshly submitted prayer request')).toBeInTheDocument();
  });

  it('does not duplicate a prayer that is already in the feed', async () => {
    renderFeed();
    await screen.findByText('Pray for patience today');

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('oratio-prayer-added', { detail: { ...basePrayers[0] } })
      );
    });

    expect(screen.getAllByText('Pray for patience today').length).toBe(1);
  });

  it('removes a prayer when the detail page dispatches oratio-prayer-removed', async () => {
    renderFeed();
    await screen.findByText('Pray for patience today');

    await act(async () => {
      window.dispatchEvent(new CustomEvent('oratio-prayer-removed', { detail: 'p1' }));
    });

    expect(screen.queryByText('Pray for patience today')).toBeNull();
  });

  it('updates prayer text when oratio-prayer-updated is dispatched', async () => {
    renderFeed();
    await screen.findByText('Pray for patience today');

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('oratio-prayer-updated', {
          detail: { prayerId: 'p1', text: 'Updated prayer wording', editedAt: new Date().toISOString() },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Updated prayer wording')).toBeInTheDocument();
    });
    expect(screen.queryByText('Pray for patience today')).toBeNull();
  });

  it('ignores circle prayers while viewing the public feed', async () => {
    renderFeed();
    await screen.findByText('Pray for patience today');

    const circlePrayer: PrayerRequest = {
      ...basePrayers[0],
      id: 'p-circle',
      audience: 'circle',
      text: 'A circle-only prayer',
    };

    await act(async () => {
      window.dispatchEvent(new CustomEvent('oratio-prayer-added', { detail: circlePrayer }));
    });

    expect(screen.queryByText('A circle-only prayer')).toBeNull();
  });
});
