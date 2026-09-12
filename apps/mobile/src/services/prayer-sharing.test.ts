import { describe, expect, it } from '@jest/globals';
import { buildPrayerShareContent } from './prayer-sharing';

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
      message:
        'Join @miriam in prayer on Oratio.\n\nhttps://oratiotest.netlify.app/prayer/prayer%20%2F%201',
    });
    expect(content?.message).not.toContain(prayer.text);
  });

  it('uses anonymous-safe wording when attribution is hidden', () => {
    expect(buildPrayerShareContent({ ...prayer, isAnonymous: true })?.message).toBe(
      'Join someone in prayer on Oratio.\n\nhttps://oratiotest.netlify.app/prayer/prayer%20%2F%201'
    );
  });

  it('does not create share content for a private prayer', () => {
    expect(buildPrayerShareContent({ ...prayer, audience: 'private' })).toBeNull();
  });
});
