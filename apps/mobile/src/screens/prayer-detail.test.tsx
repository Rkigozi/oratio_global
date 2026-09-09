import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PrayerDetailScreen } from './prayer-detail';

jest.mock('@oratio/shared/queries', () => ({
  getPrayerById: jest.fn(),
  getMyPrayedIds: jest.fn(),
  togglePray: jest.fn(),
}));

import { getPrayerById, getMyPrayedIds, togglePray } from '@oratio/shared/queries';

const prayer = {
  id: 'prayer-1',
  city: 'London',
  country: 'United Kingdom',
  text: 'Please pray for my family',
  username: 'miriam',
  prayerCount: 4,
  lat: 51.5,
  lng: -0.1,
  createdAt: new Date().toISOString(),
  commentsEnabled: true,
  audience: 'public',
};

const navigation = { goBack: jest.fn() } as never;
const route = { params: { prayerId: 'prayer-1' } } as never;

describe('PrayerDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getPrayerById).mockResolvedValue(prayer as never);
    jest.mocked(getMyPrayedIds).mockResolvedValue([] as never);
    jest.mocked(togglePray).mockResolvedValue(true as never);
  });

  it('renders the prayer text, location, and attribution', async () => {
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByText('Please pray for my family')).toBeTruthy());
    expect(screen.getByText('London, United Kingdom')).toBeTruthy();
    expect(screen.getByText('— miriam')).toBeTruthy();
  });

  it('shows the pray button and toggles to prayed state', async () => {
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByText(/Pray for this/)).toBeTruthy());

    fireEvent.press(screen.getByText(/Pray for this/));

    await waitFor(() => expect(screen.getByText(/Prayed for this/)).toBeTruthy());
    expect(togglePray).toHaveBeenCalledWith('prayer-1', true);
  });

  it('starts in the prayed state when the user already prayed', async () => {
    jest.mocked(getMyPrayedIds).mockResolvedValue(['prayer-1'] as never);

    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByText(/Prayed for this/)).toBeTruthy());
    expect(screen.getByText('5 people prayed')).toBeTruthy();
  });

  it('shows an unavailable state when the prayer is missing', async () => {
    jest.mocked(getPrayerById).mockResolvedValue(null as never);

    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    await waitFor(() =>
      expect(screen.getByText('Prayer unavailable. It may have been removed.')).toBeTruthy()
    );
  });
});
