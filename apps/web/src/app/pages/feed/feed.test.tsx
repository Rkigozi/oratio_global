import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
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
      whileTap: _whileTap,
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

const prayers: PrayerRequest[] = [
  {
    id: 'p1',
    city: 'London',
    country: 'United Kingdom',
    text: 'Please pray for patience today',
    username: 'miriam',
    prayerCount: 3,
    lat: 51.5,
    lng: -0.1,
    createdAt: new Date().toISOString(),
    commentsEnabled: true,
  },
  {
    id: 'p2',
    city: 'Lagos',
    country: 'Nigeria',
    text: 'Praying for family peace',
    username: 'daniel',
    prayerCount: 2,
    lat: 6.5,
    lng: 3.3,
    createdAt: new Date().toISOString(),
    commentsEnabled: true,
  },
];

function PrayerDetailStub() {
  const navigate = useNavigate();
  return <button onClick={() => void navigate(-1)}>Back to feed</button>;
}

describe('Feed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.setItem('oratio_feed_visited', 'true');

    vi.mocked(useGeolocation).mockReturnValue({
      location: null,
      loading: false,
      denied: false,
      error: null,
      requestLocation: vi.fn(),
      resetDenied: vi.fn(),
    });
    vi.mocked(getFeedPrayers).mockResolvedValue(prayers);
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
  });

  it('restores the previous feed scroll position after returning from prayer detail', async () => {
    render(
      <MemoryRouter initialEntries={['/feed']}>
        <Routes>
          <Route path="/feed" element={<Feed />} />
          <Route path="/prayer/:id" element={<PrayerDetailStub />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('Please pray for patience today');

    const scroller = screen.getByTestId('feed-scroll-container');
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 400 });
    Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 1600 });
    scroller.scrollTop = 640;

    await act(async () => {
      fireEvent.click(screen.getByText('Please pray for patience today'));
    });

    expect(screen.getByText('Back to feed')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('Back to feed'));
    });

    const restoredScroller = await screen.findByTestId('feed-scroll-container');
    Object.defineProperty(restoredScroller, 'clientHeight', { configurable: true, value: 400 });
    Object.defineProperty(restoredScroller, 'scrollHeight', { configurable: true, value: 1600 });

    await waitFor(() => {
      expect(restoredScroller.scrollTop).toBe(640);
    });
  });
});
