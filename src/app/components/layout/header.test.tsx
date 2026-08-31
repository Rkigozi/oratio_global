import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Header } from './header';

vi.mock('../../hooks/activity-updates-context', () => ({
  useActivityUpdates: vi.fn(),
}));

import { useActivityUpdates } from '../../hooks/activity-updates-context';

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useActivityUpdates).mockReturnValue({
      unreadCount: 0,
      liveVersion: 0,
      refreshUnreadCount: vi.fn(),
    });
  });

  it('shows the ORATIO logo on main routes', () => {
    render(
      <MemoryRouter initialEntries={['/feed']}>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByText('ORATIO')).toBeInTheDocument();
  });

  it('shows no back button on main tab routes', () => {
    render(
      <MemoryRouter initialEntries={['/feed']}>
        <Header />
      </MemoryRouter>
    );
    expect(screen.queryByRole('button', { name: 'Go back' })).toBeNull();
  });

  it('shows a back button on sub-routes', () => {
    render(
      <MemoryRouter initialEntries={['/profile/saved']}>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: 'Go back' })).toBeTruthy();
  });

  it('derives a title from the route', () => {
    render(
      <MemoryRouter initialEntries={['/profile/saved']}>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByText('Saved Prayers')).toBeInTheDocument();
    expect(screen.queryByText('ORATIO')).toBeNull();
  });

  it('maps profile submitted views to titles', () => {
    render(
      <MemoryRouter initialEntries={['/profile/submitted?view=private']}>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByText('Private Prayers')).toBeInTheDocument();
  });

  it('maps the prayer circle view to its title', () => {
    render(
      <MemoryRouter initialEntries={['/profile/submitted?view=circle']}>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByText('Prayer Circle Prayers')).toBeInTheDocument();
  });

  it('maps updates route to its title and hides the updates bell', () => {
    render(
      <MemoryRouter initialEntries={['/updates']}>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByText('Updates')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /updates/i })).toBeNull();
  });

  it('shows the unread updates badge', () => {
    vi.mocked(useActivityUpdates).mockReturnValue({
      unreadCount: 3,
      liveVersion: 0,
      refreshUnreadCount: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/feed']}>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: '3 unread updates' })).toBeTruthy();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('caps the unread badge at 9+', () => {
    vi.mocked(useActivityUpdates).mockReturnValue({
      unreadCount: 12,
      liveVersion: 0,
      refreshUnreadCount: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/feed']}>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('overrides the derived title when a title prop is given', () => {
    render(
      <MemoryRouter initialEntries={['/profile/saved']}>
        <Header title="Custom Title" />
      </MemoryRouter>
    );
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });
});
