import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { PrayerDetailScreen } from './prayer-detail';

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  Bookmark: () => null,
  CheckCircle2: () => null,
  Flag: () => null,
  Info: () => null,
  Languages: () => null,
  MapPin: () => null,
  MoreHorizontal: () => null,
  Pencil: () => null,
  Share2: () => null,
  Trash2: () => null,
  MessageCircle: () => null,
  Send: () => null,
  X: () => null,
}));

jest.mock('../hooks/auth-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@oratio/shared/queries', () => ({
  getPrayerById: jest.fn(),
  getProfilePreferences: jest.fn(),
  getMyPrayedIds: jest.fn(),
  getMySavedIds: jest.fn(),
  togglePray: jest.fn(),
  toggleSavePrayer: jest.fn(),
  updatePrayerRequest: jest.fn(),
  deletePrayerRequest: jest.fn(),
  getComments: jest.fn(),
  getCommentCount: jest.fn(),
  createComment: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  subscribeToPrayerCommentChanges: jest.fn(),
  toggleCommentsEnabled: jest.fn(),
  createReport: jest.fn(),
}));

jest.mock('../services/prayer-sharing', () => ({
  sharePrayer: jest.fn(),
}));

jest.mock('../services/prayer-translation', () => ({
  translatePrayerText: jest.fn(),
}));

import { useAuth } from '../hooks/auth-context';
import {
  getPrayerById,
  getProfilePreferences,
  getMyPrayedIds,
  getMySavedIds,
  togglePray,
  toggleSavePrayer,
  updatePrayerRequest,
  deletePrayerRequest,
  getComments,
  getCommentCount,
  subscribeToPrayerCommentChanges,
  createReport,
} from '@oratio/shared/queries';
import { sharePrayer } from '../services/prayer-sharing';
import { translatePrayerText, type PrayerTranslation } from '../services/prayer-translation';

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

const goBack = jest.fn();
const navigate = jest.fn();
const reset = jest.fn();
const navigation = { goBack, navigate, reset } as never;
const route = { params: { prayerId: 'prayer-1' } } as never;

describe('PrayerDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      profile: { username: 'testuser', display_name: 'Test User' },
    } as never);
    jest.mocked(getPrayerById).mockResolvedValue(prayer as never);
    jest.mocked(getProfilePreferences).mockResolvedValue({ language: 'auto' } as never);
    jest.mocked(getMyPrayedIds).mockResolvedValue([] as never);
    jest.mocked(getMySavedIds).mockResolvedValue([] as never);
    jest.mocked(togglePray).mockResolvedValue(true as never);
    jest.mocked(toggleSavePrayer).mockResolvedValue(true as never);
    jest.mocked(updatePrayerRequest).mockResolvedValue({
      text: 'Updated prayer body',
      editedAt: '2026-09-12T12:00:00.000Z',
    } as never);
    jest.mocked(deletePrayerRequest).mockResolvedValue(true as never);
    jest.mocked(sharePrayer).mockResolvedValue(true as never);
    jest.mocked(getComments).mockResolvedValue([] as never);
    jest.mocked(getCommentCount).mockResolvedValue(0 as never);
    jest.mocked(subscribeToPrayerCommentChanges).mockReturnValue(jest.fn());
    jest.mocked(createReport).mockResolvedValue('created' as never);
  });

  it('renders the prayer text, location, and attribution', async () => {
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByText('Please pray for my family')).toBeTruthy());
    expect(screen.getByText('London, United Kingdom')).toBeTruthy();
    expect(screen.getByText('miriam')).toBeTruthy();
  });

  it('translates into the saved language and toggles back to the original', async () => {
    jest.mocked(getProfilePreferences).mockResolvedValue({ language: 'es' } as never);
    let resolveTranslation!: (translation: PrayerTranslation) => void;
    jest.mocked(translatePrayerText).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTranslation = resolve;
        })
    );
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('Translate to Spanish'));

    expect(screen.getByText('Please pray for my family')).toBeTruthy();
    expect(screen.getByText('Translating...')).toBeTruthy();
    await act(async () => {
      resolveTranslation({
        status: 'translated',
        text: 'Por favor, ora por mi familia',
        sourceLanguage: 'en',
      });
    });

    expect(await screen.findByText('Por favor, ora por mi familia')).toBeTruthy();
    expect(screen.getByText('Translated from English to Spanish')).toBeTruthy();
    expect(screen.queryByText('Please pray for my family')).toBeNull();
    expect(translatePrayerText).toHaveBeenCalledWith({
      prayerId: 'prayer-1',
      text: 'Please pray for my family',
      targetLanguage: 'es',
    });

    fireEvent.press(screen.getByLabelText('Original'));

    expect(screen.getByText('Please pray for my family')).toBeTruthy();
    expect(screen.getByLabelText('View Spanish translation')).toBeTruthy();
    expect(translatePrayerText).toHaveBeenCalledTimes(1);
  });

  it('keeps the original readable when translation fails', async () => {
    jest.mocked(getProfilePreferences).mockResolvedValue({ language: 'de' } as never);
    jest.mocked(translatePrayerText).mockResolvedValue(null);
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('Translate to German'));

    expect(
      await screen.findByText("We couldn't translate this prayer. Please try again.")
    ).toBeTruthy();
    expect(screen.getByText('Please pray for my family')).toBeTruthy();
    expect(screen.getByLabelText('Translate to German')).toBeTruthy();
  });

  it('explains when the translation service finds no translation is needed', async () => {
    jest.mocked(getProfilePreferences).mockResolvedValue({ language: 'it' } as never);
    jest.mocked(translatePrayerText).mockResolvedValue({
      status: 'not-needed',
      sourceLanguage: 'it',
    });
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('Translate to Italian'));

    expect(await screen.findByText('This prayer is already in Italian.')).toBeTruthy();
    expect(screen.getByText('Please pray for my family')).toBeTruthy();
  });

  it('does not offer translation when the prayer matches the saved language', async () => {
    jest.mocked(getProfilePreferences).mockResolvedValue({ language: 'en' } as never);
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    await screen.findByText('Please pray for my family');

    expect(screen.queryByText(/Translate to/)).toBeNull();
    expect(translatePrayerText).not.toHaveBeenCalled();
  });

  it("opens the prayer author's profile", async () => {
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText("View @miriam's profile"));

    expect(navigate).toHaveBeenCalledWith('UserProfile', { username: 'miriam' });
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
    expect(screen.getByText('4 people prayed')).toBeTruthy();
  });

  it('increments the displayed total once after praying', async () => {
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByText('4 people prayed')).toBeTruthy());
    fireEvent.press(screen.getByText(/Pray for this/));

    await waitFor(() => expect(screen.getByText('5 people prayed')).toBeTruthy());
  });

  it('saves and unsaves the prayer from the detail header', async () => {
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('Save prayer'));

    await waitFor(() => expect(toggleSavePrayer).toHaveBeenCalledWith('prayer-1', true));
    fireEvent.press(screen.getByLabelText('Remove saved prayer'));

    await waitFor(() => expect(toggleSavePrayer).toHaveBeenCalledWith('prayer-1', false));
  });

  it('shows an unavailable state when the prayer is missing', async () => {
    jest.mocked(getPrayerById).mockResolvedValue(null as never);

    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    await waitFor(() =>
      expect(screen.getByText('Prayer unavailable. It may have been removed.')).toBeTruthy()
    );
  });

  it('shows sharing but hides owner actions from a non-owner', async () => {
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('More prayer options'));

    expect(screen.getByText('Share prayer')).toBeTruthy();
    expect(screen.queryByText('Edit prayer')).toBeNull();
    expect(screen.queryByText('Delete prayer')).toBeNull();
  });

  it('opens the native share flow with the visible prayer', async () => {
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('More prayer options'));
    fireEvent.press(screen.getByText('Share prayer'));

    await waitFor(() => expect(sharePrayer).toHaveBeenCalledWith(prayer));
  });

  it('reports a non-owned prayer without leaving its detail', async () => {
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('More prayer options'));
    fireEvent.press(screen.getByText('Report prayer'));
    fireEvent.press(screen.getByText('Harmful or unsafe'));

    await waitFor(() =>
      expect(createReport).toHaveBeenCalledWith({
        reportable_type: 'prayer',
        reportable_id: 'prayer-1',
        reason: 'Harmful or unsafe',
      })
    );
    expect(await screen.findByText(/Report sent for review/)).toBeTruthy();
    expect(goBack).not.toHaveBeenCalled();
  });

  it('lets the owner edit the prayer wording', async () => {
    jest.mocked(getPrayerById).mockResolvedValue({ ...prayer, authorId: 'user-1' } as never);
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('More prayer options'));
    fireEvent.press(screen.getByText('Edit prayer'));
    fireEvent.changeText(
      screen.getByLabelText('Prayer text'),
      'Please pray for renewed hope today'
    );
    fireEvent.press(screen.getByText('Save changes'));

    await waitFor(() =>
      expect(updatePrayerRequest).toHaveBeenCalledWith(
        'prayer-1',
        'Please pray for renewed hope today'
      )
    );
    expect(await screen.findByText('Updated prayer body')).toBeTruthy();
    expect(screen.getByText(/Edited/)).toBeTruthy();
  });

  it('keeps an invalid edit open with guidance', async () => {
    jest.mocked(getPrayerById).mockResolvedValue({ ...prayer, authorId: 'user-1' } as never);
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('More prayer options'));
    fireEvent.press(screen.getByText('Edit prayer'));
    fireEvent.changeText(screen.getByLabelText('Prayer text'), 'Too short');
    fireEvent.press(screen.getByText('Save changes'));

    expect(await screen.findByText('Prayer must be at least 10 characters')).toBeTruthy();
    expect(updatePrayerRequest).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Prayer text')).toBeTruthy();
  });

  it('requires explicit confirmation before deleting an owned prayer', async () => {
    jest.mocked(getPrayerById).mockResolvedValue({ ...prayer, authorId: 'user-1' } as never);
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('More prayer options'));
    fireEvent.press(screen.getByText('Delete prayer'));

    expect(deletePrayerRequest).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Delete prayer?',
      expect.stringContaining('removed permanently'),
      expect.any(Array)
    );

    const buttons = alertSpy.mock.calls[0]?.[2];
    const destructiveAction = buttons?.find((button) => button.style === 'destructive');
    await act(async () => {
      destructiveAction?.onPress?.();
    });

    await waitFor(() => expect(deletePrayerRequest).toHaveBeenCalledWith('prayer-1'));
    expect(reset).toHaveBeenCalledWith({
      index: 1,
      routes: [{ name: 'Main' }, { name: 'MyPrayers', params: { initialAudience: 'public' } }],
    });
    expect(goBack).not.toHaveBeenCalled();
  });

  it('keeps private prayers out of the share flow', async () => {
    jest.mocked(getPrayerById).mockResolvedValue({
      ...prayer,
      audience: 'private',
      authorId: 'user-1',
    } as never);
    render(<PrayerDetailScreen navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByLabelText('More prayer options'));

    expect(screen.queryByText('Share prayer')).toBeNull();
    expect(screen.getByText('Edit prayer')).toBeTruthy();
    expect(screen.getByText('Delete prayer')).toBeTruthy();
  });
});
