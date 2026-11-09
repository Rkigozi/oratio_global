import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { searchPrayerPlaces, type PrayerPlace } from '@oratio/shared/queries';
import { PrayerLocationPicker } from './prayer-location-picker';
jest.mock('@oratio/shared/queries', () => ({ searchPrayerPlaces: jest.fn() }));
jest.mock('lucide-react-native', () => ({
  MapPin: () => null,
  X: () => null,
  RefreshCw: () => null,
  Eye: () => null,
  EyeOff: () => null,
}));
const london: PrayerPlace = {
  id: 'geonames:2643743',
  city: 'London',
  region: 'England',
  country: 'United Kingdom',
  countryCode: 'GB',
  lat: 51.51,
  lng: -0.13,
};
const chosen = jest.fn();
function Picker() {
  const [value, setValue] = useState<PrayerPlace | null>(null);
  const [query, setQuery] = useState('');
  return (
    <PrayerLocationPicker
      value={value}
      query={query}
      disabled={false}
      onChange={(place) => {
        chosen(place);
        setValue(place);
        setQuery('');
      }}
      onQueryChange={setQuery}
    />
  );
}
async function search(query = 'London') {
  fireEvent.changeText(screen.getByLabelText('Search for a city'), query);
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
}
describe('PrayerLocationPicker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.mocked(searchPrayerPlaces).mockResolvedValue([london]);
  });
  afterEach(() => {
    jest.useRealTimers();
  });
  it('debounces typed queries and does not search one character', async () => {
    render(<Picker />);
    await search('L');
    expect(searchPrayerPlaces).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByLabelText('Search for a city'), 'Lo');
    fireEvent.changeText(screen.getByLabelText('Search for a city'), 'London');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(searchPrayerPlaces).toHaveBeenCalledTimes(1);
    expect(searchPrayerPlaces).toHaveBeenCalledWith('London');
  });
  it('selects the catalog identity and clears it explicitly', async () => {
    render(<Picker />);
    await search();
    fireEvent.press(screen.getByLabelText('Select London, England, United Kingdom'));
    expect(chosen).toHaveBeenCalledWith(london);
    expect(screen.queryByLabelText('Search for a city')).toBeNull();
    fireEvent.press(screen.getByLabelText('Clear location'));
    expect(chosen).toHaveBeenLastCalledWith(null);
    expect(screen.getByLabelText('Search for a city').props.value).toBe('');
  });
  it('distinguishes equally named cities by region and stable ID', async () => {
    const other = {
      ...london,
      id: 'geonames:1234',
      region: 'Ontario',
      country: 'Canada',
      countryCode: 'CA',
    };
    jest.mocked(searchPrayerPlaces).mockResolvedValue([london, other]);
    render(<Picker />);
    await search();
    fireEvent.press(screen.getByLabelText('Select London, Ontario, Canada'));
    expect(chosen).toHaveBeenCalledWith(other);
  });
  it('ignores an older response after the search changes', async () => {
    let finish!: (places: PrayerPlace[]) => void;
    jest.mocked(searchPrayerPlaces).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    render(<Picker />);
    await search('London');
    jest.mocked(searchPrayerPlaces).mockResolvedValue([]);
    await search('Atlantis');
    await act(async () => {
      finish([london]);
    });
    expect(screen.queryByText('London')).toBeNull();
    expect(screen.getByText('No cities found.')).toBeTruthy();
  });
  it('supports retry and clearing a failed lookup without losing the query', async () => {
    jest.mocked(searchPrayerPlaces).mockRejectedValueOnce(new Error('offline'));
    render(<Picker />);
    await search();
    expect(screen.getByLabelText('Search for a city').props.value).toBe('London');
    fireEvent.press(screen.getByLabelText('Retry city search'));
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByLabelText('Select London, England, United Kingdom')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Clear location'));
    expect(screen.queryByText('London')).toBeNull();
  });
  it('ignores responses after unmounting', async () => {
    let finish!: (places: PrayerPlace[]) => void;
    jest.mocked(searchPrayerPlaces).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const view = render(<Picker />);
    await search();
    view.unmount();
    await act(async () => {
      finish([london]);
    });
    expect(chosen).not.toHaveBeenCalled();
  });
});
