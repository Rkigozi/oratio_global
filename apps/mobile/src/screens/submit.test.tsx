import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SubmitScreen } from './submit';

jest.mock('../services/submission-id', () => ({ createSubmissionId: jest.fn() }));

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  ArrowRight: () => null,
  LocateFixed: () => null,
  Eye: () => null,
  EyeOff: () => null,
  RefreshCw: () => null,
  UsersRound: () => null,
  MapPin: () => null,
  X: () => null,
}));

let mockFocused = true;
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      useEffect(() => {
        if (mockFocused) return callback();
      }, [callback, mockFocused]);
    },
  };
});

jest.mock('../hooks/auth-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@oratio/shared/queries', () => ({
  PrayerSubmissionError: class extends Error {
    uncertain: boolean;
    constructor(value: boolean) {
      super('Submission failed');
      this.uncertain = value;
    }
  },
  createPrayerRequest: jest.fn(),
  getPrayerCircleCount: jest.fn(),
  searchPrayerPlaces: jest.fn(),
  findPrayerPlace: jest.fn(),
}));

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

import { useAuth } from '../hooks/auth-context';
import { createSubmissionId } from '../services/submission-id';
import {
  createPrayerRequest,
  PrayerSubmissionError,
  findPrayerPlace,
  getPrayerCircleCount,
  searchPrayerPlaces,
  type PrayerPlace,
} from '@oratio/shared/queries';
import * as Location from 'expo-location';

function mockAuth() {
  jest.mocked(useAuth).mockReturnValue({
    user: { id: 'user-1' },
    profile: { username: 'testuser', display_name: 'Test User' },
    loading: false,
    needsEmailVerification: false,
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
  } as never);
}

const navigation = { navigate: jest.fn(), goBack: jest.fn(), reset: jest.fn() } as never;
const route = {} as never;
const london: PrayerPlace = {
  id: 'geonames:2643743',
  city: 'London',
  region: 'England',
  country: 'United Kingdom',
  countryCode: 'GB',
  lat: 51.51,
  lng: -0.13,
};
const nairobi: PrayerPlace = {
  id: 'geonames:184745',
  city: 'Nairobi',
  region: 'Nairobi County',
  country: 'Kenya',
  countryCode: 'KE',
  lat: -1.28,
  lng: 36.82,
};
async function selectCity(city = 'London') {
  fireEvent.changeText(screen.getByLabelText('Search for a city'), city);
  const place = city === 'Nairobi' ? nairobi : london;
  fireEvent.press(
    await screen.findByLabelText(`Select ${place.city}, ${place.region}, ${place.country}`)
  );
}

function fillForm(text: string) {
  fireEvent.changeText(screen.getByLabelText('Prayer'), text);
}

describe('SubmitScreen', () => {
  afterEach(() => {
    jest.useRealTimers();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(createSubmissionId).mockReturnValue('72000000-0000-4000-8000-000000000001');
    mockFocused = true;
    mockAuth();
    jest.mocked(createPrayerRequest).mockResolvedValue('prayer-new' as never);
    jest.mocked(getPrayerCircleCount).mockResolvedValue(1);
    jest
      .mocked(searchPrayerPlaces)
      .mockImplementation(async (query) => (query === 'Nairobi' ? [nairobi] : [london]));
    jest.mocked(findPrayerPlace).mockResolvedValue(london);
    jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
      granted: true,
      canAskAgain: true,
    } as never);
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
      granted: true,
      canAskAgain: true,
    } as never);
    jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValue({
      coords: { latitude: 51.51, longitude: -0.12 },
    } as never);
    jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
      coords: { latitude: 51.51, longitude: -0.12 },
    } as never);
    jest
      .mocked(Location.reverseGeocodeAsync)
      .mockResolvedValue([{ city: 'London', country: 'United Kingdom' }] as never);
  });

  it('locks an uncertain draft and retries the same submission ID', async () => {
    jest.mocked(createPrayerRequest).mockRejectedValueOnce(new Error('response lost'));
    render(<SubmitScreen navigation={navigation} route={route} />);
    fillForm('A prayer whose confirmation was lost');
    fireEvent.press(screen.getByText('Submit Prayer'));
    await screen.findByText('Check and retry submission');
    expect(screen.getByLabelText('Prayer').props.editable).toBe(false);
    expect(screen.getByRole('radio', { name: 'Private' })).toBeDisabled();
    expect(screen.queryByText('Your prayer is live.')).toBeNull();
    fireEvent.press(screen.getByText('Check and retry submission'));
    await screen.findByText('Your prayer is live.');
    const calls = jest.mocked(createPrayerRequest).mock.calls;
    expect(calls[0][0]).toEqual(calls[1][0]);
    expect(calls[1][1]).toEqual({ ...calls[0][1], verifyExisting: true });
    expect(createSubmissionId).toHaveBeenCalledTimes(1);
  });

  it('recovers from a stalled submission without accepting a late success', async () => {
    jest.useFakeTimers();
    let finish!: (id: string) => void;
    jest.mocked(createPrayerRequest).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    render(<SubmitScreen navigation={navigation} route={route} />);
    fillForm('A stalled prayer remains safe to check');
    fireEvent.press(screen.getByText('Submit Prayer'));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(18_000);
    });
    expect(screen.getByText('Check and retry submission')).toBeTruthy();
    expect(screen.getByLabelText('Prayer').props.value).toBe(
      'A stalled prayer remains safe to check'
    );
    await act(async () => finish('late-success'));
    expect(screen.queryByText('Your prayer is live.')).toBeNull();
    fireEvent.press(screen.getByText('Check and retry submission'));
    await screen.findByText('Your prayer is live.');
    expect(jest.mocked(createPrayerRequest).mock.calls[1][1]?.requestId).toBe(
      jest.mocked(createPrayerRequest).mock.calls[0][1]?.requestId
    );
  });

  it('keeps the same uncertain attempt when verification cannot finish', async () => {
    jest
      .mocked(createPrayerRequest)
      .mockRejectedValueOnce(new Error('response lost'))
      .mockRejectedValueOnce(new PrayerSubmissionError(false));
    render(<SubmitScreen navigation={navigation} route={route} />);
    fillForm('An uncertain draft must keep its identity');
    fireEvent.press(screen.getByText('Submit Prayer'));
    await screen.findByText('Check and retry submission');
    fireEvent.press(screen.getByText('Check and retry submission'));
    await waitFor(() => expect(screen.getByText('Check and retry submission')).toBeEnabled());
    expect(screen.getByLabelText('Prayer').props.editable).toBe(false);
    fireEvent.press(screen.getByText('Check and retry submission'));
    await screen.findByText('Your prayer is live.');
    expect(
      new Set(jest.mocked(createPrayerRequest).mock.calls.map((call) => call[1]?.requestId)).size
    ).toBe(1);
  });

  it('unlocks a definitively rejected draft for editing and starts a new attempt', async () => {
    jest
      .mocked(createSubmissionId)
      .mockReturnValueOnce('72000000-0000-4000-8000-000000000001')
      .mockReturnValueOnce('72000000-0000-4000-8000-000000000002');
    jest.mocked(createPrayerRequest).mockRejectedValueOnce(new PrayerSubmissionError(false));
    render(<SubmitScreen navigation={navigation} route={route} />);
    fillForm('A rejected draft can still be edited');
    fireEvent.press(screen.getByText('Submit Prayer'));
    await screen.findByText("We couldn't share your prayer. Please try again.");
    expect(screen.getByLabelText('Prayer').props.editable).toBe(true);
    fillForm('An edited draft after a definite rejection');
    fireEvent.press(screen.getByText('Submit Prayer'));
    await screen.findByText('Your prayer is live.');
    expect(jest.mocked(createPrayerRequest).mock.calls[1][1]?.requestId).not.toBe(
      jest.mocked(createPrayerRequest).mock.calls[0][1]?.requestId
    );
  });

  it('renders the prayer, location, audience, and public preferences', () => {
    render(<SubmitScreen navigation={navigation} route={route} />);

    expect(screen.getByPlaceholderText("Share what's on your heart…")).toBeTruthy();
    expect(screen.getByLabelText('Search for a city')).toBeTruthy();
    expect(screen.getByText('Public')).toBeTruthy();
    expect(screen.getByText('Prayer Circle')).toBeTruthy();
    expect(screen.getByText('Private')).toBeTruthy();
    expect(screen.getByText('Share anonymously')).toBeTruthy();
    expect(screen.getByText('Let people encourage me')).toBeTruthy();
  });

  it('rejects prayers shorter than 10 characters', async () => {
    render(<SubmitScreen navigation={navigation} route={route} />);

    fillForm('Too short');

    fireEvent.press(screen.getByText('Submit Prayer'));

    await waitFor(() =>
      expect(screen.getByText('Prayer must be at least 10 characters')).toBeTruthy()
    );
    expect(createPrayerRequest).not.toHaveBeenCalled();
  });

  it('detects the current city and keeps the submitted map point city-level', async () => {
    render(<SubmitScreen navigation={navigation} route={route} />);

    fireEvent.press(screen.getByLabelText('Use my current location'));

    expect(await screen.findByText('London')).toBeTruthy();
    expect(screen.getByText('England, United Kingdom')).toBeTruthy();
    expect(Location.reverseGeocodeAsync).toHaveBeenCalledWith({
      latitude: 51.51,
      longitude: -0.12,
    });

    fillForm('Please pray for peace across my city today');
    fireEvent.press(screen.getByText('Submit Prayer'));

    await waitFor(() => expect(createPrayerRequest).toHaveBeenCalled());
    const coarseCoordinates = { lat: london.lat, lng: london.lng };
    expect(jest.mocked(createPrayerRequest).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        city: 'London',
        country: 'United Kingdom',
        lat: coarseCoordinates.lat,
        lng: coarseCoordinates.lng,
        placeId: london.id,
        countryCode: 'GB',
      })
    );
    expect(coarseCoordinates).not.toEqual({ lat: 51.51, lng: -0.12 });
    expect(findPrayerPlace).toHaveBeenCalledWith('London', 'United Kingdom');
  });

  it('explains when location access is unavailable without blocking manual entry', async () => {
    jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
      granted: false,
      canAskAgain: false,
    } as never);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    render(<SubmitScreen navigation={navigation} route={route} />);

    fireEvent.press(screen.getByLabelText('Use my current location'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Location access is off',
        expect.stringContaining('search')
      )
    );
    expect(screen.getByLabelText('Search for a city')).toBeTruthy();
    alertSpy.mockRestore();
  });

  it('uses the detected ISO country code rather than a localized country name', async () => {
    jest
      .mocked(Location.reverseGeocodeAsync)
      .mockResolvedValue([
        { city: 'London', country: 'Royaume-Uni', isoCountryCode: 'GB' },
      ] as never);
    render(<SubmitScreen navigation={navigation} route={route} />);
    fireEvent.press(screen.getByLabelText('Use my current location'));

    expect(await screen.findByText('London')).toBeTruthy();
    expect(findPrayerPlace).toHaveBeenCalledWith('London', 'GB');
  });

  it('allows submission without a location when the detected city is unsupported', async () => {
    jest.mocked(findPrayerPlace).mockResolvedValue(null);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    render(<SubmitScreen navigation={navigation} route={route} />);
    fillForm('Please pray for my family during this hard season');
    fireEvent.press(screen.getByLabelText('Use my current location'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Location unavailable',
        expect.stringContaining('continue without a location')
      )
    );
    fireEvent.press(screen.getByText('Submit Prayer'));
    await waitFor(() => expect(createPrayerRequest).toHaveBeenCalled());
    expect(jest.mocked(createPrayerRequest).mock.calls[0][0]).toEqual(
      expect.objectContaining({ city: 'Unknown', country: 'Unknown', lat: 0, lng: 0 })
    );
    expect(jest.mocked(createPrayerRequest).mock.calls[0][0].placeId).toBeUndefined();
    alertSpy.mockRestore();
  });

  it('asks for a selection or cleared search before submitting an unfinished city search', async () => {
    render(<SubmitScreen navigation={navigation} route={route} />);
    fillForm('Please pray for my family during this hard season');
    fireEvent.changeText(screen.getByLabelText('Search for a city'), 'London');
    fireEvent.press(screen.getByText('Submit Prayer'));

    expect(
      screen.getByText('Select a city from the results or clear the location search.')
    ).toBeTruthy();
    expect(createPrayerRequest).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Clear location'));
    fireEvent.press(screen.getByText('Submit Prayer'));
    expect(await screen.findByText('Your prayer is live.')).toBeTruthy();
  });

  it('does not replace a manual selection when an older auto-detect lookup completes', async () => {
    let resolvePlace!: (value: PrayerPlace | null) => void;
    jest.mocked(findPrayerPlace).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePlace = resolve;
        })
    );
    render(<SubmitScreen navigation={navigation} route={route} />);
    fireEvent.press(screen.getByLabelText('Use my current location'));
    await waitFor(() => expect(findPrayerPlace).toHaveBeenCalled());
    await selectCity('Nairobi');
    await act(async () => resolvePlace(london));

    expect(screen.getByText('Nairobi')).toBeTruthy();
    expect(screen.queryByText('London')).toBeNull();
  });

  it("submits a public prayer with the user's username", async () => {
    render(<SubmitScreen navigation={navigation} route={route} />);

    fillForm('Please pray for my family during this hard season');
    await selectCity();

    fireEvent.press(screen.getByText('Submit Prayer'));

    await waitFor(() => expect(createPrayerRequest).toHaveBeenCalled());

    const payload = jest.mocked(createPrayerRequest).mock.calls[0][0];
    expect(payload.text).toBe('Please pray for my family during this hard season');
    expect(payload.audience).toBe('public');
    expect(payload.username).toBe('testuser');
    expect(payload.city).toBe('London');
    expect(payload.country).toBe('United Kingdom');
    expect(getPrayerCircleCount).not.toHaveBeenCalled();
  });

  it('submits anonymously when the toggle is on', async () => {
    render(<SubmitScreen navigation={navigation} route={route} />);

    fillForm('A prayer shared without my name on it');
    await selectCity('Nairobi');

    fireEvent(screen.getByLabelText('Share anonymously'), 'valueChange', true);

    fireEvent.press(screen.getByText('Submit Prayer'));

    await waitFor(() => expect(createPrayerRequest).toHaveBeenCalled());
    const payload = jest.mocked(createPrayerRequest).mock.calls[0][0];
    expect(payload.username).toBeUndefined();
  });

  it('lets a public prayer turn encouragements off', async () => {
    render(<SubmitScreen navigation={navigation} route={route} />);

    fillForm('Please pray for wisdom as I make this decision');
    fireEvent(screen.getByLabelText('Let people encourage me'), 'valueChange', false);
    fireEvent.press(screen.getByText('Submit Prayer'));

    await waitFor(() => expect(createPrayerRequest).toHaveBeenCalled());
    expect(jest.mocked(createPrayerRequest).mock.calls[0][0].commentsEnabled).toBe(false);
  });

  it('saves private prayers without location or public preferences', async () => {
    render(<SubmitScreen navigation={navigation} route={route} />);

    fillForm('A private prayer only for me to keep');
    fireEvent.press(screen.getByText('Private'));

    expect(screen.queryByText('Share anonymously')).toBeNull();
    expect(screen.queryByText('Let people encourage me')).toBeNull();
    expect(screen.queryByLabelText('Use my current location')).toBeNull();
    expect(screen.queryByLabelText('Search for a city')).toBeNull();

    fireEvent.press(screen.getByText('Save Prayer'));

    await waitFor(() => expect(createPrayerRequest).toHaveBeenCalled());
    const payload = jest.mocked(createPrayerRequest).mock.calls[0][0];
    expect(payload.audience).toBe('private');
    expect(payload.commentsEnabled).toBe(true);
    expect(payload).toEqual(expect.objectContaining({ city: '', country: '', lat: 0, lng: 0 }));
    expect(payload.placeId).toBeUndefined();
    expect(payload.countryCode).toBeUndefined();
    expect(Location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(getPrayerCircleCount).not.toHaveBeenCalled();
    expect(await screen.findByText('Your private prayer is saved.')).toBeTruthy();
  });

  it('clears a previously entered location when switching to Private', async () => {
    render(<SubmitScreen navigation={navigation} route={route} />);
    fillForm('A private prayer only for me to keep');
    await selectCity();
    fireEvent.press(screen.getByText('Private'));
    fireEvent.press(screen.getByText('Prayer Circle'));

    expect(screen.getByLabelText('Search for a city').props.value).toBe('');
    expect(screen.getByLabelText('Prayer').props.value).toBe(
      'A private prayer only for me to keep'
    );
    fireEvent.press(screen.getByText('Private'));
    fireEvent.press(screen.getByText('Save Prayer'));

    await waitFor(() =>
      expect(createPrayerRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          audience: 'private',
          city: '',
          country: '',
          lat: 0,
          lng: 0,
        }),
        expect.objectContaining({
          requestId: expect.any(String),
          expectedUserId: 'user-1',
          throwOnError: true,
        })
      )
    );
  });

  it('starts in Private when opened from the private space and keeps it for the next prayer', async () => {
    render(
      <SubmitScreen
        navigation={navigation}
        route={{ params: { initialAudience: 'private' } } as never}
      />
    );
    expect(screen.getByRole('radio', { name: 'Private' })).toBeChecked();
    expect(screen.queryByLabelText('Use my current location')).toBeNull();
    fillForm('A quiet prayer for my own reflection');
    fireEvent.press(screen.getByText('Save Prayer'));
    fireEvent.press(await screen.findByText('Write another prayer'));

    expect(screen.getByRole('radio', { name: 'Private' })).toBeChecked();
    expect(screen.getByLabelText('Prayer').props.value).toBe('');
    expect(screen.getByText('Save Prayer')).toBeTruthy();
    expect(screen.queryByLabelText('Use my current location')).toBeNull();
  });

  it('stops before asking for location permission if the audience becomes Private', async () => {
    let resolvePermission!: (
      value: Awaited<ReturnType<typeof Location.getForegroundPermissionsAsync>>
    ) => void;
    jest.mocked(Location.getForegroundPermissionsAsync).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePermission = resolve;
        })
    );
    render(<SubmitScreen navigation={navigation} route={route} />);
    fireEvent.press(screen.getByLabelText('Use my current location'));
    fireEvent.press(screen.getByText('Private'));

    await act(async () => resolvePermission({ granted: false, canAskAgain: true } as never));
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(Location.getLastKnownPositionAsync).not.toHaveBeenCalled();
    expect(Location.reverseGeocodeAsync).not.toHaveBeenCalled();
  });

  it('ignores a stale detected city after switching to Private and back to Public', async () => {
    let resolveGeocode!: (value: Awaited<ReturnType<typeof Location.reverseGeocodeAsync>>) => void;
    jest.mocked(Location.reverseGeocodeAsync).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveGeocode = resolve;
        })
    );
    render(<SubmitScreen navigation={navigation} route={route} />);
    fireEvent.press(screen.getByLabelText('Use my current location'));
    await waitFor(() => expect(Location.reverseGeocodeAsync).toHaveBeenCalled());
    fireEvent.press(screen.getByText('Private'));
    fireEvent.press(screen.getByText('Public'));
    await act(async () => resolveGeocode([{ city: 'London', country: 'United Kingdom' }] as never));

    expect(screen.getByLabelText('Search for a city').props.value).toBe('');
    fireEvent.press(screen.getByLabelText('Use my current location'));
    expect(await screen.findByText('London')).toBeTruthy();
  });

  it('does not show stale geolocation errors on a private prayer', async () => {
    let rejectGeocode!: (reason: Error) => void;
    jest.mocked(Location.reverseGeocodeAsync).mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectGeocode = reject;
        })
    );
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    render(<SubmitScreen navigation={navigation} route={route} />);
    fireEvent.press(screen.getByLabelText('Use my current location'));
    await waitFor(() => expect(Location.reverseGeocodeAsync).toHaveBeenCalled());
    fireEvent.press(screen.getByText('Private'));
    await act(async () => rejectGeocode(new Error('Geocoding failed')));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Save Prayer')).toBeTruthy();
    alertSpy.mockRestore();
  });

  it('preserves a private draft and uses save wording after a failed save', async () => {
    jest.mocked(createPrayerRequest).mockResolvedValueOnce(null);
    render(
      <SubmitScreen
        navigation={navigation}
        route={{ params: { initialAudience: 'private' } } as never}
      />
    );
    fillForm('A quiet prayer for my own reflection');
    fireEvent.press(screen.getByText('Save Prayer'));

    expect(await screen.findByText("We couldn't save your prayer. Please try again.")).toBeTruthy();
    expect(screen.getByLabelText('Prayer').props.value).toBe(
      'A quiet prayer for my own reflection'
    );
    expect(screen.getByRole('radio', { name: 'Private' })).toBeChecked();
    fireEvent.press(screen.getByText('Save Prayer'));
    expect(await screen.findByText('Your private prayer is saved.')).toBeTruthy();
  });

  it('shows the success state and links to the submitted prayer', async () => {
    render(<SubmitScreen navigation={navigation} route={route} />);

    fillForm('Thank you Lord for another day of grace');
    fireEvent.press(screen.getByText('Submit Prayer'));

    await waitFor(() => expect(screen.getByText('Your prayer is live.')).toBeTruthy());

    fireEvent.press(screen.getByText('View Prayer'));
    expect((navigation as unknown as { reset: jest.Mock }).reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: 'Main', params: { screen: 'Public' } },
        { name: 'PrayerDetail', params: { prayerId: 'prayer-new' } },
      ],
    });
  });

  it.each([
    { audience: 'public', tab: 'Public', label: 'Back to Public prayers' },
    { audience: 'circle', tab: 'Circle', label: 'Back to Prayer Circle' },
    { audience: 'private', tab: 'Private', label: 'Back to Private prayers' },
  ] as const)(
    'returns a $audience prayer to the matching main tab with no completed composer in history',
    async ({ audience, tab, label }) => {
      render(
        <SubmitScreen
          navigation={navigation}
          route={{ params: { initialAudience: audience } } as never}
        />
      );
      fillForm('A prayer to return to the main journey');
      const submitLabel = audience === 'private' ? 'Save Prayer' : 'Submit Prayer';
      await waitFor(() => expect(screen.getByRole('button', { name: submitLabel })).toBeEnabled());
      fireEvent.press(screen.getByText(submitLabel));
      const back = await screen.findByRole('button', { name: label });
      expect((navigation as unknown as { reset: jest.Mock }).reset).not.toHaveBeenCalled();
      fireEvent.press(back);
      expect((navigation as unknown as { reset: jest.Mock }).reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Main', params: { screen: tab } }],
      });
      expect(createPrayerRequest).toHaveBeenCalledTimes(1);
    }
  );

  it.each([
    { audience: 'circle', tab: 'Circle' },
    { audience: 'private', tab: 'Private' },
  ] as const)(
    'opens a newly saved $audience prayer above its matching main tab',
    async ({ audience, tab }) => {
      render(
        <SubmitScreen
          navigation={navigation}
          route={{ params: { initialAudience: audience } } as never}
        />
      );
      fillForm('A prayer I want to view after saving');
      const submitLabel = audience === 'private' ? 'Save Prayer' : 'Submit Prayer';
      await waitFor(() => expect(screen.getByRole('button', { name: submitLabel })).toBeEnabled());
      fireEvent.press(screen.getByText(submitLabel));
      fireEvent.press(await screen.findByText('View Prayer'));
      expect((navigation as unknown as { reset: jest.Mock }).reset).toHaveBeenCalledWith({
        index: 1,
        routes: [
          { name: 'Main', params: { screen: tab } },
          { name: 'PrayerDetail', params: { prayerId: 'prayer-new' } },
        ],
      });
    }
  );

  it('returns to the audience actually submitted after switching away from the entry-point audience', async () => {
    render(
      <SubmitScreen
        navigation={navigation}
        route={{ params: { initialAudience: 'public' } } as never}
      />
    );
    fillForm('A prayer I decided to keep just for myself');
    fireEvent.press(screen.getByText('Private'));
    fireEvent.press(screen.getByText('Save Prayer'));
    fireEvent.press(await screen.findByText('Back to Private prayers'));
    expect((navigation as unknown as { reset: jest.Mock }).reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Main', params: { screen: 'Private' } }],
    });
  });

  it('shows an error when the backend rejects the prayer', async () => {
    jest.mocked(createPrayerRequest).mockResolvedValue(null as never);

    render(<SubmitScreen navigation={navigation} route={route} />);

    fillForm('Please pray for provision in this season');
    fireEvent.press(screen.getByText('Submit Prayer'));

    await waitFor(() =>
      expect(screen.getByText("We couldn't share your prayer. Please try again.")).toBeTruthy()
    );
    expect(screen.queryByText('Back to Public prayers')).toBeNull();
    expect((navigation as unknown as { reset: jest.Mock }).reset).not.toHaveBeenCalled();
  });

  it('blocks an empty Circle before insertion, explains accepted connections, and preserves the draft', async () => {
    jest.mocked(getPrayerCircleCount).mockResolvedValue(0);
    render(<SubmitScreen navigation={navigation} route={route} />);
    fillForm('A prayer for my new Prayer Circle');
    fireEvent.press(screen.getByText('Prayer Circle'));
    expect(screen.getByRole('button', { name: 'Submit Prayer' })).toBeDisabled();
    expect(
      await screen.findByText(
        'You need at least one accepted Prayer Circle connection before sharing here.'
      )
    ).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Submit Prayer' }));
    expect(createPrayerRequest).not.toHaveBeenCalled();
    expect(getPrayerCircleCount).toHaveBeenCalledWith('user-1', { throwOnError: true });
    fireEvent.press(screen.getByText('Manage Prayer Circle'));
    expect((navigation as unknown as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith(
      'PrayerCircleManagement'
    );
    expect(screen.getByLabelText('Prayer').props.value).toBe('A prayer for my new Prayer Circle');
    fireEvent.press(screen.getByText('Private'));
    expect(screen.getByRole('button', { name: 'Save Prayer' })).toBeEnabled();
    fireEvent.press(screen.getByText('Save Prayer'));
    expect(await screen.findByText('Your private prayer is saved.')).toBeTruthy();
    expect(createPrayerRequest).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'private' }),
      expect.any(Object)
    );
  });

  it('allows Circle submission after a fresh connection check and never makes it anonymous', async () => {
    render(<SubmitScreen navigation={navigation} route={route} />);
    fillForm('A prayer to share with my trusted Circle');
    fireEvent(screen.getByLabelText('Share anonymously'), 'valueChange', true);
    fireEvent.press(screen.getByText('Prayer Circle'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit Prayer' })).toBeEnabled()
    );
    expect(screen.queryByText('Share anonymously')).toBeNull();
    fireEvent.press(screen.getByText('Submit Prayer'));
    expect(await screen.findByText('Shared with your Prayer Circle.')).toBeTruthy();
    expect(createPrayerRequest).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'circle', username: 'testuser' }),
      expect.any(Object)
    );
    expect(getPrayerCircleCount).toHaveBeenCalledTimes(2);
  });

  it('rechecks an empty Circle when returning from management without losing the draft', async () => {
    jest.mocked(getPrayerCircleCount).mockResolvedValue(0);
    const { rerender } = render(
      <SubmitScreen
        navigation={navigation}
        route={{ params: { initialAudience: 'circle' } } as never}
      />
    );
    fillForm('Keep this Circle draft while I invite someone');
    await screen.findByText('Manage Prayer Circle');
    mockFocused = false;
    rerender(
      <SubmitScreen
        navigation={navigation}
        route={{ params: { initialAudience: 'circle' } } as never}
      />
    );
    jest.mocked(getPrayerCircleCount).mockResolvedValue(1);
    mockFocused = true;
    rerender(
      <SubmitScreen
        navigation={navigation}
        route={{ params: { initialAudience: 'circle' } } as never}
      />
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit Prayer' })).toBeEnabled()
    );
    expect(screen.getByLabelText('Prayer').props.value).toBe(
      'Keep this Circle draft while I invite someone'
    );
    expect(screen.getByRole('radio', { name: 'Prayer Circle' })).toBeChecked();
  });

  it('keeps a failed Circle check distinct from an empty Circle and allows retry', async () => {
    jest.mocked(getPrayerCircleCount).mockRejectedValueOnce(new Error('offline'));
    render(
      <SubmitScreen
        navigation={navigation}
        route={{ params: { initialAudience: 'circle' } } as never}
      />
    );
    fillForm('A Circle prayer ready for when the connection returns');
    expect(
      await screen.findByText(
        "We couldn't check your Prayer Circle. Your draft is still here. Please try again."
      )
    ).toBeTruthy();
    expect(screen.queryByText('Manage Prayer Circle')).toBeNull();
    expect(screen.getByRole('button', { name: 'Submit Prayer' })).toBeDisabled();
    fireEvent.press(screen.getByText('Check again'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit Prayer' })).toBeEnabled()
    );
    expect(screen.getByLabelText('Prayer').props.value).toBe(
      'A Circle prayer ready for when the connection returns'
    );
    expect(createPrayerRequest).not.toHaveBeenCalled();
  });

  it('blocks submission if the final connection has been removed since selecting Circle', async () => {
    render(
      <SubmitScreen
        navigation={navigation}
        route={{ params: { initialAudience: 'circle' } } as never}
      />
    );
    fillForm('A Circle prayer with a recently removed connection');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit Prayer' })).toBeEnabled()
    );
    jest.mocked(getPrayerCircleCount).mockResolvedValue(0);
    fireEvent.press(screen.getByText('Submit Prayer'));
    expect(await screen.findByText('Manage Prayer Circle')).toBeTruthy();
    expect(createPrayerRequest).not.toHaveBeenCalled();
    expect(screen.queryByText("We couldn't share your prayer. Please try again.")).toBeNull();
    expect(screen.getByLabelText('Prayer').props.value).toBe(
      'A Circle prayer with a recently removed connection'
    );
  });

  it('does not insert when the save-time Circle check fails, and supports recovery', async () => {
    render(
      <SubmitScreen
        navigation={navigation}
        route={{ params: { initialAudience: 'circle' } } as never}
      />
    );
    fillForm('A Circle prayer to retry after losing the network');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit Prayer' })).toBeEnabled()
    );
    jest.mocked(getPrayerCircleCount).mockRejectedValueOnce(new Error('offline'));
    fireEvent.press(screen.getByText('Submit Prayer'));
    expect(await screen.findByText('Check again')).toBeTruthy();
    expect(createPrayerRequest).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Check again'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit Prayer' })).toBeEnabled()
    );
    fireEvent.press(screen.getByText('Submit Prayer'));
    expect(await screen.findByText('Shared with your Prayer Circle.')).toBeTruthy();
  });

  it('prevents repeat submissions while verifying a Circle connection', async () => {
    let resolve!: (count: number) => void;
    render(
      <SubmitScreen
        navigation={navigation}
        route={{ params: { initialAudience: 'circle' } } as never}
      />
    );
    fillForm('A Circle prayer submitted only once');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit Prayer' })).toBeEnabled()
    );
    jest.mocked(getPrayerCircleCount).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    const submit = screen.getByRole('button', { name: 'Submit Prayer' });
    act(() => {
      fireEvent.press(submit);
      fireEvent.press(submit);
    });
    expect(createPrayerRequest).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: 'Private' })).toBeDisabled();
    await act(async () => resolve(1));
    expect(await screen.findByText('Shared with your Prayer Circle.')).toBeTruthy();
    expect(createPrayerRequest).toHaveBeenCalledTimes(1);
    expect(getPrayerCircleCount).toHaveBeenCalledTimes(2);
  });

  it('ignores a stale Circle result after changing audience', async () => {
    let resolve!: (count: number) => void;
    jest.mocked(getPrayerCircleCount).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    render(
      <SubmitScreen
        navigation={navigation}
        route={{ params: { initialAudience: 'circle' } } as never}
      />
    );
    fillForm('A prayer that I chose to keep private');
    fireEvent.press(screen.getByText('Private'));
    await act(async () => resolve(0));
    expect(screen.queryByText('Manage Prayer Circle')).toBeNull();
    fireEvent.press(screen.getByText('Save Prayer'));
    expect(await screen.findByText('Your private prayer is saved.')).toBeTruthy();
    expect(createPrayerRequest).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'private' }),
      expect.any(Object)
    );
  });

  it('abandons a save-time check after navigating away rather than posting later', async () => {
    let resolve!: (count: number) => void;
    jest.mocked(getPrayerCircleCount).mockResolvedValue(1);
    const { rerender } = render(
      <SubmitScreen
        navigation={navigation}
        route={{ params: { initialAudience: 'circle' } } as never}
      />
    );
    fillForm('A prayer that should not post after leaving');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit Prayer' })).toBeEnabled()
    );
    jest.mocked(getPrayerCircleCount).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    fireEvent.press(screen.getByText('Submit Prayer'));
    mockFocused = false;
    rerender(
      <SubmitScreen
        navigation={navigation}
        route={{ params: { initialAudience: 'circle' } } as never}
      />
    );
    await act(async () => resolve(1));
    expect(createPrayerRequest).not.toHaveBeenCalled();
  });
});
