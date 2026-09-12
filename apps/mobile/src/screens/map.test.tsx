import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { LocationPrayersScreen, MapScreen } from './map';

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
const mockAnimateToRegion = jest.fn();

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  ArrowRight: () => null,
  LocateFixed: () => null,
  RefreshCw: () => null,
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { Pressable } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef(({ children, accessibilityLabel, onPress }: never, ref: never) => {
      React.useImperativeHandle(ref, () => ({ animateToRegion: mockAnimateToRegion }));
      return (
        <Pressable accessibilityLabel={accessibilityLabel} onPress={onPress}>
          {children}
        </Pressable>
      );
    }),
    Marker: ({ children, accessibilityLabel, onPress }: never) => (
      <Pressable accessibilityLabel={accessibilityLabel} onPress={onPress}>
        {children}
      </Pressable>
    ),
  };
});

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getCurrentPositionAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
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
  getMapHotspots: jest.fn(),
  getPublicPrayersAtLocation: jest.fn(),
}));

import { getMapHotspots, getPublicPrayersAtLocation } from '@oratio/shared/queries';
import * as Location from 'expo-location';

const hotspot = {
  id: 'location:london|united kingdom',
  city: 'London',
  country: 'United Kingdom',
  text: '',
  prayerCount: 7,
  requestCount: 3,
  lat: 51.5,
  lng: -0.1,
};

const prayer = {
  id: 'prayer-1',
  city: 'London',
  country: 'United Kingdom',
  text: 'Please pray for my family',
  prayerCount: 2,
  lat: 51.5,
  lng: -0.1,
};

describe('MapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getMapHotspots).mockResolvedValue([hotspot] as never);
    jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
      canAskAgain: true,
      granted: true,
      status: 'granted',
    } as never);
    jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValue({
      coords: { latitude: 51.5, longitude: -0.1 },
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the global map and its public prayer hotspots', async () => {
    render(<MapScreen />);

    expect(screen.getByLabelText('Global prayer map')).toBeTruthy();
    expect(screen.getByText('ORATIO')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByLabelText('View prayer activity in London')).toBeTruthy()
    );
  });

  it('shows reliable location totals and opens the location prayer list', async () => {
    render(<MapScreen />);

    const marker = await screen.findByLabelText('View prayer activity in London');
    fireEvent.press(marker);

    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('prayer requests')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('people prayed')).toBeTruthy();

    fireEvent(screen.getByLabelText('Global prayer map'), 'press', {
      nativeEvent: { action: 'marker-press' },
    });
    expect(screen.getByText('View London prayers')).toBeTruthy();

    fireEvent.press(screen.getByText('View London prayers'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('LocationPrayers', {
      city: 'London',
      country: 'United Kingdom',
    });
  });

  it('shows a clear empty state when no public locations exist', async () => {
    jest.mocked(getMapHotspots).mockResolvedValue([] as never);

    render(<MapScreen />);

    await waitFor(() => expect(screen.getByText('The map is quiet for now')).toBeTruthy());
  });

  it('offers a retry when the map request fails', async () => {
    jest.mocked(getMapHotspots).mockRejectedValue(new Error('network') as never);

    render(<MapScreen />);

    await waitFor(() => expect(screen.getByText('Try again')).toBeTruthy());
    expect(screen.getByText(/couldn't load the prayer map/i)).toBeTruthy();
  });

  it('returns to the current location with one button press', async () => {
    jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
      canAskAgain: true,
      granted: false,
      status: 'undetermined',
    } as never);
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
      canAskAgain: true,
      granted: true,
      status: 'granted',
    } as never);

    render(<MapScreen />);

    fireEvent.press(screen.getByLabelText('Go to my location'));

    await waitFor(() =>
      expect(mockAnimateToRegion).toHaveBeenCalledWith(
        {
          latitude: 51.5,
          longitude: -0.1,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        },
        600
      )
    );
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);

    fireEvent.press(await screen.findByLabelText('View prayer activity in London'));
    expect(screen.getByText('View London prayers')).toBeTruthy();
  });

  it('explains how to enable location when access is denied', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
      canAskAgain: false,
      granted: false,
      status: 'denied',
    } as never);

    render(<MapScreen />);
    fireEvent.press(screen.getByLabelText('Go to my location'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Location access is off', expect.any(String))
    );
    expect(Location.getLastKnownPositionAsync).not.toHaveBeenCalled();
  });
});

describe('LocationPrayersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getPublicPrayersAtLocation).mockResolvedValue([prayer] as never);
  });

  it('loads the selected location and opens a prayer', async () => {
    render(
      <LocationPrayersScreen
        navigation={mockNavigation as never}
        route={{ params: { city: 'London', country: 'United Kingdom' } } as never}
      />
    );

    await waitFor(() =>
      expect(getPublicPrayersAtLocation).toHaveBeenCalledWith('London', 'United Kingdom', 50, {
        throwOnError: true,
      })
    );
    fireEvent.press(screen.getByText('Please pray for my family'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('PrayerDetail', {
      prayerId: 'prayer-1',
    });
  });
});
