import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { MyPrayersScreen } from './my-prayers';

const goBack = jest.fn();
const navigate = jest.fn();
const navigation = { goBack, navigate } as never;

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  Plus: () => null,
}));

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      useEffect(callback, [callback]);
    },
  };
});

jest.mock('@oratio/shared/queries', () => ({
  getMyPrayers: jest.fn(),
}));

import { getMyPrayers } from '@oratio/shared/queries';

const publicPrayer = {
  id: 'public-1',
  city: 'London',
  country: 'United Kingdom',
  text: 'My public prayer request',
  username: 'miriam',
  prayerCount: 2,
  lat: 51.5,
  lng: -0.1,
  audience: 'public',
};

const circlePrayer = {
  ...publicPrayer,
  id: 'circle-1',
  text: 'My Circle prayer request',
  audience: 'circle',
};

const privatePrayer = {
  ...publicPrayer,
  id: 'private-1',
  text: 'My private prayer request',
  audience: 'private',
};

function renderScreen(initialAudience?: 'public' | 'circle' | 'private') {
  return render(
    <MyPrayersScreen
      navigation={navigation}
      route={{ params: initialAudience ? { initialAudience } : undefined } as never}
    />
  );
}

describe('MyPrayersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getMyPrayers).mockImplementation((audience) => {
      if (audience === 'public') return Promise.resolve([publicPrayer] as never);
      if (audience === 'circle') return Promise.resolve([circlePrayer] as never);
      return Promise.resolve([privatePrayer] as never);
    });
  });

  it('loads every owned prayer space and shows public prayers by default', async () => {
    renderScreen();

    expect(await screen.findByText('My public prayer request')).toBeTruthy();
    expect(getMyPrayers).toHaveBeenCalledWith('public');
    expect(getMyPrayers).toHaveBeenCalledWith('circle');
    expect(getMyPrayers).toHaveBeenCalledWith('private');
    expect(screen.getByText('3 prayers across your spaces')).toBeTruthy();
  });

  it('opens the audience selected from the Profile count', async () => {
    renderScreen('circle');

    expect(await screen.findByText('My Circle prayer request')).toBeTruthy();
    expect(screen.queryByText('My public prayer request')).toBeNull();
  });

  it('switches between owned prayer spaces', async () => {
    renderScreen();
    await screen.findByText('My public prayer request');

    fireEvent.press(screen.getByLabelText('Show my private prayers'));

    expect(screen.getByText('My private prayer request')).toBeTruthy();
    expect(screen.queryByText('My public prayer request')).toBeNull();
  });

  it('opens an owned prayer for management', async () => {
    renderScreen();
    fireEvent.press(await screen.findByText('My public prayer request'));

    expect(navigate).toHaveBeenCalledWith('PrayerDetail', { prayerId: 'public-1' });
  });

  it('refreshes all spaces when the screen regains focus', async () => {
    renderScreen();

    await waitFor(() => expect(getMyPrayers).toHaveBeenCalledTimes(3));
  });
});
