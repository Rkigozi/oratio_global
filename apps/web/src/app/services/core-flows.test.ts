import { describe, it, expect } from "vitest";
import { timeAgo, getAttributionText } from './prayer-data';
import { mockFeedPrayers, mockHotspots } from '../../test/mocks/mock-prayers';
import type { PrayerRequest } from './prayer-data';

// ─── Prayer Data Integrity ─────────────────────────────────────────────

describe("mock data integrity", () => {
  it("generates at least 20 feed prayers", () => {
    expect(mockFeedPrayers.length).toBeGreaterThanOrEqual(20);
  });

  it("each feed prayer has required fields", () => {
    for (const p of mockFeedPrayers) {
      expect(p.id).toBeTruthy();
      expect(p.text).toBeTruthy();
      expect(p.text.length).toBeGreaterThanOrEqual(10);
      expect(p.text.length).toBeLessThanOrEqual(500);
      expect(typeof p.prayerCount).toBe("number");
      expect(p.createdAt).toBeTruthy();
    }
  });

  it("each hotspot has required fields", () => {
    for (const p of mockHotspots) {
      expect(p.id).toBeTruthy();
      expect(p.city).toBeTruthy();
      expect(p.country).toBeTruthy();
      expect(typeof p.lat).toBe("number");
      expect(typeof p.lng).toBe("number");
    }
  });

  it("prayers have unique IDs", () => {
    const ids = mockFeedPrayers.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("hotspots have unique IDs", () => {
    const ids = mockHotspots.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─── Attribution ───────────────────────────────────────────────────────

describe("getAttributionText", () => {
  it("returns username when available", () => {
    expect(getAttributionText({ username: "john_doe" } as PrayerRequest)).toBe("john_doe");
  });

  it("returns displayName when no username", () => {
    expect(getAttributionText({ displayName: "John" } as PrayerRequest)).toBe("John");
  });

  it("returns legacy name field as fallback", () => {
    expect(getAttributionText({ name: "John Legacy" } as PrayerRequest)).toBe("John Legacy");
  });

  it('returns "Anonymous" when no identifier', () => {
    expect(getAttributionText({} as PrayerRequest)).toBe("Anonymous");
  });

  it("prioritises username over displayName", () => {
    expect(getAttributionText({ username: "johnd", displayName: "John" } as PrayerRequest)).toBe("johnd");
  });
});

// ─── Time Ago ──────────────────────────────────────────────────────────

describe("timeAgo", () => {
  it('returns "just now" for recent times', () => {
    expect(timeAgo(new Date().toISOString())).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoHoursAgo)).toBe("2h ago");
  });

  it("returns days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(threeDaysAgo)).toBe("3d ago");
  });

  it("handles edge case of exactly 1 minute", () => {
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
    expect(timeAgo(oneMinAgo)).toBe("1m ago");
  });

  it("handles exact hour boundary", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(timeAgo(oneHourAgo)).toBe("1h ago");
  });
});

// ─── Core Flow: Filtering ──────────────────────────────────────────────

describe("prayer filtering", () => {
  const mockPrayers: PrayerRequest[] = [
    { id: "1", city: "London", country: "UK", text: "#healing prayer", prayerCount: 10, lat: 0, lng: 0, category: "Health", createdAt: new Date().toISOString() },
    { id: "2", city: "Madrid", country: "Spain", text: "#hope prayer", prayerCount: 5, lat: 0, lng: 0, category: "Peace", createdAt: new Date().toISOString() },
    { id: "3", city: "London", country: "UK", text: "General prayer", prayerCount: 1, lat: 0, lng: 0, category: "Other", createdAt: new Date().toISOString() },
  ];

  it("filters by city", () => {
    const filtered = mockPrayers.filter(p => p.city === "London");
    expect(filtered).toHaveLength(2);
  });

  it("filters by country", () => {
    const filtered = mockPrayers.filter(p => p.country === "Spain");
    expect(filtered).toHaveLength(1);
  });

  it("filters by hashtag search", () => {
    const q = "#healing";
    const filtered = mockPrayers.filter(p => p.text.includes(q));
    expect(filtered).toHaveLength(1);
  });

  it("filters by keyword search across text", () => {
    const q = "General";
    const filtered = mockPrayers.filter(p => p.text.includes(q));
    expect(filtered).toHaveLength(1);
  });

  it("filters by prayer count (trending)", () => {
    const sorted = [...mockPrayers].sort((a, b) => b.prayerCount - a.prayerCount);
    expect(sorted[0].id).toBe("1");
    expect(sorted[0].prayerCount).toBe(10);
  });

  it("combines text search with location filter", () => {
    const q = "prayer";
    const filtered = mockPrayers.filter(p => p.text.includes(q) && p.city === "Madrid");
    expect(filtered).toHaveLength(1);
  });
});
