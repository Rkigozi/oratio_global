import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SubmitScreen } from './submit';

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  LocateFixed: () => null,
  Eye: () => null,
  EyeOff: () => null,
}));

jest.mock('../hooks/auth-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@oratio/shared/queries', () => ({
  createPrayerRequest: jest.fn(),
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
import { createPrayerRequest } from '@oratio/shared/queries';
import { getApproximateCoordinates } from '@oratio/shared/prayer-data';
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

const navigation = { navigate: jest.fn(), goBack: jest.fn() } as never;
const route = {} as never;

function fillForm(text: string) {
  fireEvent.changeText(screen.getByLabelText('Prayer'), text);
}

describe('SubmitScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth();
    jest.mocked(createPrayerRequest).mockResolvedValue('prayer-new' as never);
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

  it('renders the prayer, location, audience, and public preferences', () => {
    render(<SubmitScreen navigation={navigation} route={route} />);

    expect(screen.getByPlaceholderText("Share what's on your heart…")).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. London')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. United Kingdom')).toBeTruthy();
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

    expect(await screen.findByDisplayValue('London')).toBeTruthy();
    expect(screen.getByDisplayValue('United Kingdom')).toBeTruthy();
    expect(Location.reverseGeocodeAsync).toHaveBeenCalledWith({
      latitude: 51.51,
      longitude: -0.12,
    });

    fillForm('Please pray for peace across my city today');
    fireEvent.press(screen.getByText('Submit Prayer'));

    await waitFor(() => expect(createPrayerRequest).toHaveBeenCalled());
    const coarseCoordinates = getApproximateCoordinates('London', 'United Kingdom');
    expect(jest.mocked(createPrayerRequest).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        city: 'London',
        country: 'United Kingdom',
        lat: coarseCoordinates.lat,
        lng: coarseCoordinates.lng,
      })
    );
    expect(coarseCoordinates).not.toEqual({ lat: 51.51, lng: -0.12 });
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
        expect.stringContaining('enter')
      )
    );
    expect(screen.getByPlaceholderText('e.g. London')).toBeTruthy();
    alertSpy.mockRestore();
  });

  it("submits a public prayer with the user's username", async () => {
    render(<SubmitScreen navigation={navigation} route={route} />);

    fillForm('Please pray for my family during this hard season');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. London'), 'London');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. United Kingdom'), 'United Kingdom');

    fireEvent.press(screen.getByText('Submit Prayer'));

    await waitFor(() => expect(createPrayerRequest).toHaveBeenCalled());

    const payload = jest.mocked(createPrayerRequest).mock.calls[0][0];
    expect(payload.text).toBe('Please pray for my family during this hard season');
    expect(payload.audience).toBe('public');
    expect(payload.username).toBe('testuser');
    expect(payload.city).toBe('London');
    expect(payload.country).toBe('United Kingdom');
  });

  it('submits anonymously when the toggle is on', async () => {
    render(<SubmitScreen navigation={navigation} route={route} />);

    fillForm('A prayer shared without my name on it');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. London'), 'Nairobi');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. United Kingdom'), 'Kenya');

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
    expect(screen.queryByPlaceholderText('e.g. London')).toBeNull();
    expect(screen.queryByPlaceholderText('e.g. United Kingdom')).toBeNull();

    fireEvent.press(screen.getByText('Save Prayer'));

    await waitFor(() => expect(createPrayerRequest).toHaveBeenCalled());
    const payload = jest.mocked(createPrayerRequest).mock.calls[0][0];
    expect(payload.audience).toBe('private');
    expect(payload.commentsEnabled).toBe(true);
    expect(payload).toEqual(expect.objectContaining({ city: '', country: '', lat: 0, lng: 0 }));
    expect(Location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(await screen.findByText('Your private prayer is saved.')).toBeTruthy();
  });

  it('clears a previously entered location when switching to Private', async () => {
    render(<SubmitScreen navigation={navigation} route={route} />);
    fillForm('A private prayer only for me to keep');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. London'), 'London');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. United Kingdom'), 'United Kingdom');
    fireEvent.press(screen.getByText('Private'));
    fireEvent.press(screen.getByText('Prayer Circle'));

    expect(screen.getByPlaceholderText('e.g. London').props.value).toBe('');
    expect(screen.getByPlaceholderText('e.g. United Kingdom').props.value).toBe('');
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

    expect(screen.getByPlaceholderText('e.g. London').props.value).toBe('');
    expect(screen.getByPlaceholderText('e.g. United Kingdom').props.value).toBe('');
    fireEvent.press(screen.getByLabelText('Use my current location'));
    expect(await screen.findByDisplayValue('London')).toBeTruthy();
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
    expect((navigation as unknown as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith(
      'PrayerDetail',
      { prayerId: 'prayer-new' }
    );
  });

  it('shows an error when the backend rejects the prayer', async () => {
    jest.mocked(createPrayerRequest).mockResolvedValue(null as never);

    render(<SubmitScreen navigation={navigation} route={route} />);

    fillForm('Please pray for provision in this season');
    fireEvent.press(screen.getByText('Submit Prayer'));

    await waitFor(() =>
      expect(screen.getByText("We couldn't share your prayer. Please try again.")).toBeTruthy()
    );
  });
});
