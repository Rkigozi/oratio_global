import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { buildPrayerShareContent, copyPrayerLink, sharePrayer } from './prayer-sharing';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Clipboard.setStringAsync).mockResolvedValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const prayer = {
  id: 'prayer / 1',
  city: 'London',
  country: 'United Kingdom',
  text: 'A sensitive prayer body that must not leave Oratio',
  username: 'miriam',
  prayerCount: 4,
  lat: 51.5,
  lng: -0.1,
  audience: 'public' as const,
};

describe('buildPrayerShareContent', () => {
  it('builds an attributed authenticated web link without exposing prayer text', () => {
    const content = buildPrayerShareContent(prayer);

    expect(content).toEqual({
      title: 'Pray with me on Oratio',
      message: 'Join @miriam in prayer on Oratio.',
      url: 'https://oratiotest.netlify.app/prayer/prayer%20%2F%201',
    });
    expect(content?.message).not.toContain(prayer.text);
  });

  it('uses anonymous-safe wording when attribution is hidden', () => {
    expect(buildPrayerShareContent({ ...prayer, isAnonymous: true })?.message).toBe(
      'Join someone in prayer on Oratio.'
    );
  });

  it('does not create share content for a private prayer', () => {
    expect(buildPrayerShareContent({ ...prayer, audience: 'private' })).toBeNull();
  });

  it('includes the link in the message on Android, where the URL field is unsupported', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(buildPrayerShareContent(prayer)).toEqual({
      title: 'Pray with me on Oratio',
      message:
        'Join @miriam in prayer on Oratio.\n\nhttps://oratiotest.netlify.app/prayer/prayer%20%2F%201',
    });
  });
});

describe('sharePrayer', () => {
  it.each([
    [Share.sharedAction, 'com.apple.UIKit.activity.Message', 'shared'],
    [Share.sharedAction, 'com.apple.UIKit.activity.CopyToPasteboard', 'copied'],
    [Share.dismissedAction, undefined, 'dismissed'],
  ])('handles the native result %s / %s as %s', async (action, activityType, expected) => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action, activityType });

    expect(await sharePrayer(prayer)).toBe(expected);
    expect(share).toHaveBeenCalledWith(buildPrayerShareContent(prayer));
    expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
  });

  it('does not claim a message was sent when the Android chooser opens', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    expect(await sharePrayer(prayer)).toBe('opened');
  });

  it('propagates native failures so the screen can offer a retry', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('Native presentation failed'));
    await expect(sharePrayer(prayer)).rejects.toThrow('Native presentation failed');
    expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
  });

  it('does not open the share sheet for a private prayer', async () => {
    const share = jest.spyOn(Share, 'share');
    expect(await sharePrayer({ ...prayer, audience: 'private' })).toBe('unavailable');
    expect(share).not.toHaveBeenCalled();
  });
});

describe('copyPrayerLink', () => {
  it.each(['public', 'circle'] as const)(
    'copies only the URL for a %s prayer',
    async (audience) => {
      expect(await copyPrayerLink({ ...prayer, audience })).toBe(true);
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
        'https://oratiotest.netlify.app/prayer/prayer%20%2F%201'
      );
    }
  );

  it('does not change the clipboard for private prayers', async () => {
    expect(await copyPrayerLink({ ...prayer, audience: 'private' })).toBe(false);
    expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
  });

  it('preserves a declined clipboard write as a failure', async () => {
    jest.mocked(Clipboard.setStringAsync).mockResolvedValue(false);
    expect(await copyPrayerLink(prayer)).toBe(false);
  });

  it('propagates clipboard errors for visible failure feedback', async () => {
    jest.mocked(Clipboard.setStringAsync).mockRejectedValue(new Error('Clipboard failed'));
    await expect(copyPrayerLink(prayer)).rejects.toThrow('Clipboard failed');
  });
});
