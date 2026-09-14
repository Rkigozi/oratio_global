import { Platform, Share, type ShareContent } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { PrayerRequest } from '@oratio/shared/prayer-data';
import { ORATIO_WEB_URL } from './external-links';

function getShareAttribution(prayer: PrayerRequest): string | null {
  if (prayer.isAnonymous) return null;
  if (prayer.username) return `@${prayer.username}`;
  return prayer.displayName || prayer.name || null;
}

export function getPrayerShareUrl(prayer: PrayerRequest): string | null {
  if (prayer.audience === 'private') return null;
  return `${ORATIO_WEB_URL}/prayer/${encodeURIComponent(prayer.id)}`;
}

export function buildPrayerShareContent(prayer: PrayerRequest): ShareContent | null {
  const url = getPrayerShareUrl(prayer);
  if (!url) return null;

  const attribution = getShareAttribution(prayer);
  const introduction = attribution
    ? `Join ${attribution} in prayer on Oratio.`
    : 'Join someone in prayer on Oratio.';
  return {
    title: 'Pray with me on Oratio',
    ...(Platform.OS === 'ios'
      ? { message: introduction, url }
      : { message: `${introduction}\n\n${url}` }),
  };
}

export type PrayerShareResult = 'shared' | 'copied' | 'dismissed' | 'opened' | 'unavailable';

export async function sharePrayer(prayer: PrayerRequest): Promise<PrayerShareResult> {
  const content = buildPrayerShareContent(prayer);
  if (!content) return 'unavailable';

  const result = await Share.share(content);
  if (result.action === Share.dismissedAction) return 'dismissed';
  if (result.activityType === 'com.apple.UIKit.activity.CopyToPasteboard') return 'copied';
  // Android reports completion when the chooser opens, not when a message is sent.
  return Platform.OS === 'android' ? 'opened' : 'shared';
}

export async function copyPrayerLink(prayer: PrayerRequest): Promise<boolean> {
  const url = getPrayerShareUrl(prayer);
  if (!url) return false;
  return Clipboard.setStringAsync(url);
}
