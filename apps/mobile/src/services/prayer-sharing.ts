import { Share, type ShareContent } from 'react-native';
import type { PrayerRequest } from '@oratio/shared/prayer-data';

const ORATIO_WEB_URL = 'https://oratiotest.netlify.app';

function getShareAttribution(prayer: PrayerRequest): string | null {
  if (prayer.isAnonymous) return null;
  if (prayer.username) return `@${prayer.username}`;
  return prayer.displayName || prayer.name || null;
}

export function buildPrayerShareContent(prayer: PrayerRequest): ShareContent | null {
  if (prayer.audience === 'private') return null;

  const attribution = getShareAttribution(prayer);
  const introduction = attribution
    ? `Join ${attribution} in prayer on Oratio.`
    : 'Join someone in prayer on Oratio.';
  const url = `${ORATIO_WEB_URL}/prayer/${encodeURIComponent(prayer.id)}`;

  return {
    title: 'Pray with me on Oratio',
    message: `${introduction}\n\n${url}`,
  };
}

export async function sharePrayer(prayer: PrayerRequest): Promise<boolean> {
  const content = buildPrayerShareContent(prayer);
  if (!content) return false;

  await Share.share(content);
  return true;
}
