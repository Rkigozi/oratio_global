import { describe, it, expect } from "vitest";
import { timeAgo, getAttributionText, mockFeedPrayers, mockHotspots, CATEGORIES } from "./prayer-data";

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
});

describe("getAttributionText", () => {
  it("returns username when available", () => {
    expect(getAttributionText({ username: "john_doe" } as any)).toBe("john_doe");
  });

  it("returns displayName when no username", () => {
    expect(getAttributionText({ displayName: "John" } as any)).toBe("John");
  });

  it('returns "Anonymous" when no name', () => {
    expect(getAttributionText({} as any)).toBe("Anonymous");
  });
});

describe("mock data", () => {
  it("generates hotspot markers", () => {
    expect(mockHotspots.length).toBeGreaterThan(0);
    expect(mockHotspots[0]).toHaveProperty("city");
    expect(mockHotspots[0]).toHaveProperty("prayerCount");
  });

  it("generates feed prayers", () => {
    expect(mockFeedPrayers.length).toBeGreaterThan(0);
    expect(mockFeedPrayers[0]).toHaveProperty("text");
    expect(mockFeedPrayers[0]).toHaveProperty("category");
  });

  it("prayers have valid categories", () => {
    mockFeedPrayers.forEach((p) => {
      if (p.category) {
        expect(CATEGORIES).toContain(p.category);
      }
    });
  });
});
