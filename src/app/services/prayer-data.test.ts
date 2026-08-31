import { describe, it, expect } from 'vitest';
import {
  getApproximateCoordinates,
  getAttributionText,
  hasMappablePrayerLocation,
  getPrayerLocationKey,
  normalizePrayerLocation,
  timeAgo,
} from './prayer-data';
import { mockFeedPrayers, mockHotspots } from '../../test/mocks/mock-prayers';

describe('timeAgo', () => {
  it('returns "just now" for recent times', () => {
    expect(timeAgo(new Date().toISOString())).toBe('just now');
  });

  it('returns minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoHoursAgo)).toBe('2h ago');
  });

  it('returns days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(threeDaysAgo)).toBe('3d ago');
  });
});

describe('getAttributionText', () => {
  it('returns username when available', () => {
    expect(getAttributionText({ username: 'john_doe' } as any)).toBe('john_doe');
  });

  it('returns displayName when no username', () => {
    expect(getAttributionText({ displayName: 'John' } as any)).toBe('John');
  });

  it('returns "Anonymous" when no name', () => {
    expect(getAttributionText({} as any)).toBe('Anonymous');
  });
});

describe('normalizePrayerLocation', () => {
  it('groups Greater London under London', () => {
    expect(normalizePrayerLocation('Greater London', 'United Kingdom')).toEqual({
      city: 'London',
      country: 'United Kingdom',
    });
  });

  it('groups London boroughs under London', () => {
    expect(normalizePrayerLocation('London Borough of Lambeth', 'England')).toEqual({
      city: 'London',
      country: 'United Kingdom',
    });
  });

  it('normalizes UK aliases for London', () => {
    expect(normalizePrayerLocation('London', 'UK')).toEqual({
      city: 'London',
      country: 'United Kingdom',
    });
  });

  it('keeps unrelated locations distinct', () => {
    expect(normalizePrayerLocation('Manchester', 'United Kingdom')).toEqual({
      city: 'Manchester',
      country: 'United Kingdom',
    });
  });

  it('builds one key for London variants', () => {
    expect(getPrayerLocationKey('London', 'UK')).toBe(
      getPrayerLocationKey('Greater London', 'United Kingdom')
    );
  });

  it('uses canonical city coordinates for location aliases', () => {
    expect(getApproximateCoordinates('Greater London', 'UK')).toEqual(
      getApproximateCoordinates('London', 'United Kingdom')
    );
  });

  it('does not treat unknown or 0,0 locations as mappable', () => {
    expect(
      hasMappablePrayerLocation({
        city: 'Unknown',
        country: 'Unknown',
        lat: 0,
        lng: 0,
      })
    ).toBe(false);
    expect(
      hasMappablePrayerLocation({
        city: 'London',
        country: 'United Kingdom',
        lat: 51.5,
        lng: -0.1,
      })
    ).toBe(true);
  });
});

describe('mock data', () => {
  it('generates hotspot markers', () => {
    expect(mockHotspots.length).toBeGreaterThan(0);
    expect(mockHotspots[0]).toHaveProperty('city');
    expect(mockHotspots[0]).toHaveProperty('prayerCount');
  });

  it('generates feed prayers', () => {
    expect(mockFeedPrayers.length).toBeGreaterThan(0);
    expect(mockFeedPrayers[0]).toHaveProperty('text');
    expect(mockFeedPrayers[0]).toHaveProperty('category');
  });

  it('prayers do not have categories (categories removed)', () => {
    mockFeedPrayers.forEach((p) => {
      expect(p.category).toBeUndefined();
    });
  });
});
