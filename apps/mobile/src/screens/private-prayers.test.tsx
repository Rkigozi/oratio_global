import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PrivatePrayersScreen } from './private-prayers';

const mockNavigation = { navigate: jest.fn() };

jest.mock('lucide-react-native', () => ({
  Plus: () => null,
}));

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useNavigation: () => mockNavigation,
    useFocusEffect: (callback: () => void | (() => void)) => {
      useEffect(callback, [callback]);
    },
  };
});

jest.mock('@oratio/shared/queries', () => ({
  getMyPrayers: jest.fn(),
}));

import { getMyPrayers } from '@oratio/shared/queries';

const privatePrayer = {
  id: 'private-1',
  city: 'London',
  country: 'United Kingdom',
  text: 'A prayer just for me',
  username: 'miriam',
  prayerCount: 0,
  lat: 51.5,
  lng: -0.1,
  createdAt: new Date().toISOString(),
  commentsEnabled: true,
  audience: 'private',
};

describe('PrivatePrayersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries and renders only the signed-in users private prayers', async () => {
    jest.mocked(getMyPrayers).mockResolvedValue([privatePrayer] as never);

    render(<PrivatePrayersScreen />);

    await waitFor(() => expect(getMyPrayers).toHaveBeenCalledWith('private'));
    expect(screen.getByText('A prayer just for me')).toBeTruthy();
  });

  it('shows a private-space empty state', async () => {
    jest.mocked(getMyPrayers).mockResolvedValue([] as never);

    render(<PrivatePrayersScreen />);

    await waitFor(() => expect(screen.getByText('A quiet place for your prayers')).toBeTruthy());
    expect(
      screen.getByText('Private prayers and notes will stay here, just for you.')
    ).toBeTruthy();
  });

  it('opens a private prayer from the list', async () => {
    jest.mocked(getMyPrayers).mockResolvedValue([privatePrayer] as never);

    render(<PrivatePrayersScreen />);
    await waitFor(() => expect(screen.getByText('A prayer just for me')).toBeTruthy());
    fireEvent.press(screen.getByText('A prayer just for me'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('PrayerDetail', {
      prayerId: 'private-1',
    });
  });
});
