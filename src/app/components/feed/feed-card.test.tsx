import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { FeedCard } from './feed-card';
import type { PrayerRequest } from '../../services/prayer-data';

vi.mock('../../services/upload', () => ({
  getInitialAvatarUrl: () => 'https://ui-avatars.com/api/?name=T',
}));

const mockPrayer: PrayerRequest = {
  id: 'p1',
  city: 'London',
  country: 'UK',
  text: 'Praying for peace #peace',
  username: 'testuser',
  displayName: 'Test User',
  prayerCount: 5,
  lat: 51.5,
  lng: -0.1,
  category: 'Peace',
  createdAt: new Date().toISOString(),
  commentsEnabled: true,
};

describe('FeedCard', () => {
  it('renders prayer text and attribution', () => {
    render(
      <MemoryRouter>
        <FeedCard
          prayer={mockPrayer}
          index={0}
          hasPrayed={false}
          onPrayed={vi.fn()}
          onTap={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/Praying for peace/)).toBeTruthy();
    expect(screen.getByText('testuser')).toBeTruthy();
  });

  it('shows pray button with count', () => {
    render(
      <MemoryRouter>
        <FeedCard
          prayer={mockPrayer}
          index={0}
          hasPrayed={false}
          onPrayed={vi.fn()}
          onTap={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('shows an edited label for edited prayers', () => {
    render(
      <MemoryRouter>
        <FeedCard
          prayer={{ ...mockPrayer, editedAt: new Date().toISOString() }}
          index={0}
          hasPrayed={false}
          onPrayed={vi.fn()}
          onTap={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Edited')).toBeTruthy();
  });

  it('labels Prayer Circle prayers', () => {
    render(
      <MemoryRouter>
        <FeedCard
          prayer={{ ...mockPrayer, audience: 'circle' }}
          index={0}
          hasPrayed={false}
          onPrayed={vi.fn()}
          onTap={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Prayer Circle')).toBeTruthy();
  });

  it('labels private prayers', () => {
    render(
      <MemoryRouter>
        <FeedCard
          prayer={{ ...mockPrayer, audience: 'private' }}
          index={0}
          hasPrayed={false}
          onPrayed={vi.fn()}
          onTap={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Private')).toBeTruthy();
  });

  it('calls onPrayed when pray button clicked', () => {
    const onPrayed = vi.fn();
    render(
      <MemoryRouter>
        <FeedCard
          prayer={mockPrayer}
          index={0}
          hasPrayed={false}
          onPrayed={onPrayed}
          onTap={vi.fn()}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Pray'));
    expect(onPrayed).toHaveBeenCalledWith('p1');
  });

  it('calls onTap when card is clicked', () => {
    const onTap = vi.fn();
    render(
      <MemoryRouter>
        <FeedCard
          prayer={mockPrayer}
          index={0}
          hasPrayed={false}
          onPrayed={vi.fn()}
          onTap={onTap}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Praying for peace/));
    expect(onTap).toHaveBeenCalledWith(mockPrayer);
  });

  it('shows Comment button when comments are enabled', () => {
    render(
      <MemoryRouter>
        <FeedCard
          prayer={mockPrayer}
          index={0}
          hasPrayed={false}
          onPrayed={vi.fn()}
          onTap={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Comment')).toBeTruthy();
  });

  it('shows Off when comments are disabled', () => {
    render(
      <MemoryRouter>
        <FeedCard
          prayer={{ ...mockPrayer, commentsEnabled: false }}
          index={0}
          hasPrayed={false}
          onPrayed={vi.fn()}
          onTap={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Off')).toBeTruthy();
  });

  it('calls onUserClick when username is clicked', () => {
    const onUserClick = vi.fn();
    render(
      <MemoryRouter>
        <FeedCard
          prayer={mockPrayer}
          index={0}
          hasPrayed={false}
          onPrayed={vi.fn()}
          onTap={vi.fn()}
          onUserClick={onUserClick}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('testuser'));
    expect(onUserClick).toHaveBeenCalledWith('testuser');
  });
});
