import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Alert, FlatList, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { LocationPrayersScreen, MapScreen } from './map';
import type { MapHotspot } from '@oratio/shared/map-hotspots';

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
const mockAnimateToRegion = jest.fn();
let mockMapViewProps: { customMapStyle?: unknown; userInterfaceStyle?: string } = {};
let mockFocused = true;

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
    default: React.forwardRef(
      (
        { children, accessibilityLabel, customMapStyle, onPress, userInterfaceStyle }: never,
        ref: never
      ) => {
        mockMapViewProps = { customMapStyle, userInterfaceStyle };
        React.useImperativeHandle(ref, () => ({ animateToRegion: mockAnimateToRegion }));
        return (
          <Pressable accessibilityLabel={accessibilityLabel} onPress={onPress}>
            {children}
          </Pressable>
        );
      }
    ),
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
      useEffect(() => {
        if (mockFocused) return callback();
      }, [callback, mockFocused]);
    },
  };
});

jest.mock('@oratio/shared/queries', () => ({
  getMapHotspots: jest.fn(),
  getPublicPrayersAtLocationPage: jest.fn(),
}));

import {
  getMapHotspots,
  getPublicPrayersAtLocationPage,
  type LocationPrayerPage,
} from '@oratio/shared/queries';
import * as Location from 'expo-location';

const hotspot: MapHotspot = {
  placeId: 'geonames:2643743',
  city: 'London',
  country: 'United Kingdom',
  countryCode: 'GB',
  peoplePrayedCount: 7,
  requestCount: 3,
  recentRequestCount: 3,
  lat: 51.5,
  lng: -0.1,
  latestRequestCreatedAt: new Date(Date.now() - 1000).toISOString(),
  nextExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
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
    mockFocused = true;
    jest.mocked(getMapHotspots).mockReset().mockResolvedValue([hotspot]);
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
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('refreshes aggregate counts when the next request expires', async () => {
    jest.useFakeTimers();
    const start = Date.now();
    jest
      .mocked(getMapHotspots)
      .mockResolvedValueOnce([
        { ...hotspot, nextExpiresAt: new Date(start + 1000).toISOString() },
      ] as never)
      .mockResolvedValue([
        {
          ...hotspot,
          requestCount: 2,
          recentRequestCount: 2,
          nextExpiresAt: new Date(start + 10000).toISOString(),
        },
      ] as never);
    render(<MapScreen />);
    await screen.findByLabelText('View prayer activity in London');
    await act(async () => {
      jest.advanceTimersByTime(1001);
    });
    expect(getMapHotspots).toHaveBeenCalledTimes(2);
    fireEvent.press(screen.getByLabelText('View prayer activity in London'));
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.queryByText('3')).toBeNull();
  });

  it('renders the global map and its public prayer hotspots', async () => {
    render(<MapScreen />);

    expect(screen.getByLabelText('Global prayer map')).toBeTruthy();
    expect(mockMapViewProps.userInterfaceStyle).toBe('dark');
    expect(mockMapViewProps.customMapStyle).toBeTruthy();
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
      placeId: 'geonames:2643743',
    });
  });

  it('shows a clear empty state when no public locations exist', async () => {
    jest.mocked(getMapHotspots).mockResolvedValue([] as never);

    render(<MapScreen />);

    await waitFor(() => expect(screen.getByText('The map is quiet for now')).toBeTruthy());
  });

  it('shows a single request and zero people-prayed without fabricated fallback counts', async () => {
    jest
      .mocked(getMapHotspots)
      .mockResolvedValue([
        { ...hotspot, requestCount: 1, recentRequestCount: 1, peoplePrayedCount: 0 },
      ]);
    render(<MapScreen />);
    fireEvent.press(await screen.findByLabelText('View prayer activity in London'));
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByText('prayer request')).toBeTruthy();
    expect(screen.getByText('people prayed')).toBeTruthy();
  });

  it('passes canonical place identity when opening a hotspot', async () => {
    jest.mocked(getMapHotspots).mockResolvedValue([hotspot]);
    render(<MapScreen />);
    fireEvent.press(await screen.findByLabelText('View prayer activity in London'));
    fireEvent.press(screen.getByText('View London prayers'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('LocationPrayers', {
      city: 'London',
      country: 'United Kingdom',
      placeId: 'geonames:2643743',
    });
  });

  it('offers a retry when the map request fails', async () => {
    jest.mocked(getMapHotspots).mockRejectedValue(new Error('network') as never);

    render(<MapScreen />);

    await waitFor(() => expect(screen.getByText('Try again')).toBeTruthy());
    expect(screen.getByText(/couldn't load the prayer map/i)).toBeTruthy();
    expect(screen.queryByText('The map is quiet for now')).toBeNull();
    jest.mocked(getMapHotspots).mockResolvedValue([hotspot]);
    fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByLabelText('View prayer activity in London')).toBeTruthy();
  });

  it('shows loading without prematurely reporting an empty map', async () => {
    let finish!: (value: MapHotspot[]) => void;
    jest.mocked(getMapHotspots).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    render(<MapScreen />);
    expect(screen.getByLabelText('Refresh prayer map')).toBeDisabled();
    expect(screen.queryByText('The map is quiet for now')).toBeNull();
    await act(async () => finish([]));
    expect(screen.getByText('The map is quiet for now')).toBeTruthy();
    expect(screen.getByLabelText('Refresh prayer map')).not.toBeDisabled();
  });

  it('clears old counts and selection after refresh fails, then recovers on retry', async () => {
    render(<MapScreen />);
    fireEvent.press(await screen.findByLabelText('View prayer activity in London'));
    expect(screen.getByText('View London prayers')).toBeTruthy();
    jest.mocked(getMapHotspots).mockRejectedValueOnce(new Error('offline'));
    fireEvent.press(screen.getByLabelText('Refresh prayer map'));
    expect(await screen.findByText('Try again')).toBeTruthy();
    expect(screen.queryByLabelText('View prayer activity in London')).toBeNull();
    expect(screen.queryByText('View London prayers')).toBeNull();
    expect(screen.queryByText('The map is quiet for now')).toBeNull();
    fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByLabelText('View prayer activity in London')).toBeTruthy();
  });

  it('sizes markers by recent requests, independently of people-prayed counts', async () => {
    render(<MapScreen />);
    await screen.findByLabelText('View prayer activity in London');
    const width = () =>
      StyleSheet.flatten(screen.getByTestId('hotspot-geonames:2643743').props.style).width;
    expect(width()).toBe(20);
    jest.mocked(getMapHotspots).mockResolvedValue([{ ...hotspot, peoplePrayedCount: 10000 }]);
    fireEvent.press(screen.getByLabelText('Refresh prayer map'));
    fireEvent.press(await screen.findByLabelText('View prayer activity in London'));
    await screen.findByText('10000');
    expect(width()).toBe(20);
    jest
      .mocked(getMapHotspots)
      .mockResolvedValue([{ ...hotspot, requestCount: 7, recentRequestCount: 7 }]);
    fireEvent.press(screen.getByLabelText('Refresh prayer map'));
    await waitFor(() => expect(width()).toBe(22));
  });

  it('hides an expired aggregate when its refresh fails instead of keeping stale counts', async () => {
    jest.useFakeTimers();
    const start = Date.now();
    jest
      .mocked(getMapHotspots)
      .mockResolvedValueOnce([{ ...hotspot, nextExpiresAt: new Date(start + 1000).toISOString() }])
      .mockRejectedValue(new Error('offline'));
    render(<MapScreen />);
    fireEvent.press(await screen.findByLabelText('View prayer activity in London'));
    await act(async () => {
      jest.advanceTimersByTime(1001);
    });
    expect(screen.queryByLabelText('View prayer activity in London')).toBeNull();
    expect(screen.queryByText('View London prayers')).toBeNull();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(getMapHotspots).toHaveBeenCalledTimes(2);
  });

  it('ignores a superseded response after leaving and returning to the map', async () => {
    let finishOld!: (value: MapHotspot[]) => void;
    jest.mocked(getMapHotspots).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        })
    );
    const view = render(<MapScreen />);
    await waitFor(() => expect(getMapHotspots).toHaveBeenCalledTimes(1));
    mockFocused = false;
    view.rerender(<MapScreen />);
    jest.mocked(getMapHotspots).mockResolvedValue([
      {
        ...hotspot,
        placeId: 'geonames:184745',
        city: 'Nairobi',
        country: 'Kenya',
        countryCode: 'KE',
        lat: -1.28,
        lng: 36.82,
      },
    ]);
    mockFocused = true;
    view.rerender(<MapScreen />);
    expect(await screen.findByLabelText('View prayer activity in Nairobi')).toBeTruthy();
    await act(async () => finishOld([hotspot]));
    expect(screen.queryByLabelText('View prayer activity in London')).toBeNull();
    expect(screen.getByLabelText('View prayer activity in Nairobi')).toBeTruthy();
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
  const cursor = { createdAt: '2026-10-21T12:00:00.123456Z', id: 'prayer-1' };
  const firstPage: LocationPrayerPage = { prayers: [prayer], nextCursor: cursor, totalCount: 55 };
  const secondPrayer = { ...prayer, id: 'prayer-2', text: 'A second prayer' };
  const lastPage: LocationPrayerPage = {
    prayers: [secondPrayer],
    nextCursor: null,
    totalCount: null,
  };
  const renderList = () =>
    render(
      <LocationPrayersScreen
        navigation={mockNavigation as never}
        route={
          {
            params: {
              city: 'London',
              country: 'United Kingdom',
              placeId: 'geonames:2643743',
            },
          } as never
        }
      />
    );
  const list = () => screen.UNSAFE_getByType(FlatList);
  const refresh = () => act(async () => list().props.refreshControl.props.onRefresh());

  beforeEach(() => {
    jest.clearAllMocks();
    mockFocused = true;
    jest.mocked(getPublicPrayersAtLocationPage).mockReset().mockResolvedValue(firstPage);
  });

  it('loads by canonical identity even if display labels differ', async () => {
    render(
      <LocationPrayersScreen
        navigation={mockNavigation as never}
        route={
          {
            params: { city: 'Greater London', country: 'UK', placeId: 'geonames:2643743' },
          } as never
        }
      />
    );
    await waitFor(() =>
      expect(getPublicPrayersAtLocationPage).toHaveBeenCalledWith('Greater London', 'UK', {
        placeId: 'geonames:2643743',
      })
    );
  });

  it('loads the selected location and opens a prayer', async () => {
    render(
      <LocationPrayersScreen
        navigation={mockNavigation as never}
        route={{ params: { city: 'London', country: 'United Kingdom' } } as never}
      />
    );

    await waitFor(() =>
      expect(getPublicPrayersAtLocationPage).toHaveBeenCalledWith('London', 'United Kingdom', {
        placeId: undefined,
      })
    );
    fireEvent.press(screen.getByText('Please pray for my family'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('PrayerDetail', {
      prayerId: 'prayer-1',
    });
  });

  it('separates the location total from loaded rows and appends a cursor page once', async () => {
    renderList();
    expect(await screen.findByText('55 prayer requests at last refresh')).toBeTruthy();
    expect(screen.getByText('1 loaded')).toBeTruthy();
    let finish!: (page: LocationPrayerPage) => void;
    jest.mocked(getPublicPrayersAtLocationPage).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    fireEvent(list(), 'endReached');
    fireEvent(list(), 'endReached');
    expect(getPublicPrayersAtLocationPage).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('Loading more prayers')).toBeTruthy();
    expect(getPublicPrayersAtLocationPage).toHaveBeenLastCalledWith('London', 'United Kingdom', {
      placeId: 'geonames:2643743',
      cursor,
    });
    await act(async () => finish({ ...lastPage, prayers: [prayer, secondPrayer, secondPrayer] }));
    expect(list().props.data.map((item: { id: string }) => item.id)).toEqual([
      'prayer-1',
      'prayer-2',
    ]);
    expect(screen.getByText('2 loaded')).toBeTruthy();
    expect(screen.getByText('55 prayer requests at last refresh')).toBeTruthy();
    expect(screen.getByText("You're up to date")).toBeTruthy();
    fireEvent(list(), 'endReached');
    expect(getPublicPrayersAtLocationPage).toHaveBeenCalledTimes(2);
  });

  it('keeps rows and cursor after a page failure and retries only when requested', async () => {
    renderList();
    await screen.findByText('1 loaded');
    jest.mocked(getPublicPrayersAtLocationPage).mockRejectedValueOnce(new Error('offline'));
    fireEvent(list(), 'endReached');
    expect(await screen.findByText('Retry loading more')).toBeTruthy();
    expect(screen.getByText(prayer.text)).toBeTruthy();
    fireEvent(list(), 'endReached');
    expect(getPublicPrayersAtLocationPage).toHaveBeenCalledTimes(2);
    jest.mocked(getPublicPrayersAtLocationPage).mockResolvedValueOnce(lastPage);
    fireEvent.press(screen.getByText('Retry loading more'));
    expect(await screen.findByText('2 loaded')).toBeTruthy();
    expect(getPublicPrayersAtLocationPage).toHaveBeenLastCalledWith('London', 'United Kingdom', {
      placeId: 'geonames:2643743',
      cursor,
    });
  });

  it('reaches all 55 prayers beyond the first 50-row page', async () => {
    const prayers = Array.from({ length: 55 }, (_, n) => ({
      ...prayer,
      id: `prayer-${n + 1}`,
      text: `Prayer request ${n + 1}`,
    }));
    const nextCursor = { ...cursor, id: 'prayer-50' };
    jest
      .mocked(getPublicPrayersAtLocationPage)
      .mockResolvedValueOnce({ prayers: prayers.slice(0, 50), nextCursor, totalCount: 55 })
      .mockResolvedValueOnce({ prayers: prayers.slice(50), nextCursor: null, totalCount: null });
    renderList();
    await screen.findByText('50 loaded');
    expect(list().props.data).toHaveLength(50);
    fireEvent(list(), 'endReached');
    await screen.findByText('55 loaded');
    expect(list().props.data.map((item: { id: string }) => item.id)).toEqual(
      prayers.map((item) => item.id)
    );
    expect(getPublicPrayersAtLocationPage).toHaveBeenLastCalledWith('London', 'United Kingdom', {
      placeId: 'geonames:2643743',
      cursor: nextCursor,
    });
    expect(screen.getByText('55 prayer requests at last refresh')).toBeTruthy();
  });

  it('replaces pages, total and cursor on refresh and ignores an old in-flight page', async () => {
    renderList();
    await screen.findByText('1 loaded');
    let finish!: (page: LocationPrayerPage) => void;
    jest.mocked(getPublicPrayersAtLocationPage).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    fireEvent(list(), 'endReached');
    const refreshed = { ...prayer, id: 'new-prayer', text: 'Newly shared prayer' };
    jest
      .mocked(getPublicPrayersAtLocationPage)
      .mockResolvedValueOnce({ prayers: [refreshed], totalCount: 1, nextCursor: null });
    await refresh();
    expect(screen.getByText('1 prayer request at last refresh')).toBeTruthy();
    expect(screen.queryByText(prayer.text)).toBeNull();
    await act(async () => finish(lastPage));
    expect(list().props.data.map((item: { id: string }) => item.id)).toEqual(['new-prayer']);
    fireEvent(list(), 'endReached');
    expect(getPublicPrayersAtLocationPage).toHaveBeenCalledTimes(3);
  });

  it('retains existing rows on a failed refresh and offers refresh retry', async () => {
    renderList();
    await screen.findByText('1 loaded');
    jest.mocked(getPublicPrayersAtLocationPage).mockRejectedValueOnce(new Error('offline'));
    await refresh();
    expect(screen.getByText(prayer.text)).toBeTruthy();
    expect(screen.getByText('Retry refresh')).toBeTruthy();
    fireEvent(list(), 'endReached');
    expect(getPublicPrayersAtLocationPage).toHaveBeenCalledTimes(2);
    jest
      .mocked(getPublicPrayersAtLocationPage)
      .mockResolvedValueOnce({ ...lastPage, totalCount: 1 });
    fireEvent.press(screen.getByText('Retry refresh'));
    expect(await screen.findByText(secondPrayer.text)).toBeTruthy();
    expect(screen.queryByText(prayer.text)).toBeNull();
  });

  it('distinguishes initial failure from a genuine empty location', async () => {
    jest.mocked(getPublicPrayersAtLocationPage).mockRejectedValueOnce(new Error('offline'));
    renderList();
    expect(await screen.findByText('Try again')).toBeTruthy();
    expect(screen.queryByText(/No public prayers are available/)).toBeNull();
    jest
      .mocked(getPublicPrayersAtLocationPage)
      .mockResolvedValueOnce({ prayers: [], nextCursor: null, totalCount: 0 });
    fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByText('No public prayers are available here right now.')).toBeTruthy();
    expect(screen.getByText('0 prayer requests at last refresh')).toBeTruthy();
    expect(screen.queryByText('Load more prayers')).toBeNull();
  });

  it('ignores stale page results after leaving and returning', async () => {
    let finish!: (page: LocationPrayerPage) => void;
    jest.mocked(getPublicPrayersAtLocationPage).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const view = renderList();
    const element = () => (
      <LocationPrayersScreen
        navigation={mockNavigation as never}
        route={
          {
            params: {
              city: 'London',
              country: 'United Kingdom',
              placeId: 'geonames:2643743',
            },
          } as never
        }
      />
    );
    mockFocused = false;
    view.rerender(element());
    jest
      .mocked(getPublicPrayersAtLocationPage)
      .mockResolvedValueOnce({ ...lastPage, totalCount: 1 });
    mockFocused = true;
    view.rerender(element());
    expect(await screen.findByText(secondPrayer.text)).toBeTruthy();
    await act(async () => finish(firstPage));
    expect(screen.queryByText(prayer.text)).toBeNull();
    expect(screen.getByText('1 prayer request at last refresh')).toBeTruthy();
  });

  it('omits an unavailable total instead of confusing it with the loaded count', async () => {
    jest
      .mocked(getPublicPrayersAtLocationPage)
      .mockResolvedValueOnce({ ...firstPage, totalCount: null });
    renderList();
    expect(await screen.findByText('1 loaded')).toBeTruthy();
    expect(screen.queryByText(/at last refresh/)).toBeNull();
  });
});
