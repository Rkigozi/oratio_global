import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAttributionText, timeAgo, type PrayerRequest } from "./types";

const basePrayer: PrayerRequest = {
  id: "1",
  city: "London",
  country: "GB",
  text: "test prayer",
  prayerCount: 0,
  lat: 51.5,
  lng: -0.12,
};

describe("getAttributionText", () => {
  it("returns username when present", () => {
    const prayer = { ...basePrayer, username: "alice" };
    expect(getAttributionText(prayer)).toBe("alice");
  });

  it("returns displayName when username is absent", () => {
    const prayer = { ...basePrayer, displayName: "Alice" };
    expect(getAttributionText(prayer)).toBe("Alice");
  });

  it("returns name when username and displayName are absent", () => {
    const prayer = { ...basePrayer, name: "Alice Smith" };
    expect(getAttributionText(prayer)).toBe("Alice Smith");
  });

  it("returns Anonymous when no attribution field is present", () => {
    expect(getAttributionText(basePrayer)).toBe("Anonymous");
  });

  it("prefers username over displayName and name", () => {
    const prayer = {
      ...basePrayer,
      username: "alice",
      displayName: "Alice",
      name: "Alice Smith",
    };
    expect(getAttributionText(prayer)).toBe("alice");
  });

  it("prefers displayName over name", () => {
    const prayer = {
      ...basePrayer,
      displayName: "Alice",
      name: "Alice Smith",
    };
    expect(getAttributionText(prayer)).toBe("Alice");
  });
});

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for < 1 minute ago', () => {
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    expect(timeAgo("2025-01-01T12:00:00Z")).toBe("just now");
    expect(timeAgo("2025-01-01T11:59:30Z")).toBe("just now");
  });

  it('returns "Xm ago" for 1–59 minutes', () => {
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    expect(timeAgo("2025-01-01T11:59:00Z")).toBe("1m ago");
    expect(timeAgo("2025-01-01T11:30:00Z")).toBe("30m ago");
    expect(timeAgo("2025-01-01T11:01:00Z")).toBe("59m ago");
  });

  it('returns "Xh ago" for 1–23 hours', () => {
    vi.setSystemTime(new Date("2025-01-02T12:00:00Z"));
    expect(timeAgo("2025-01-02T11:00:00Z")).toBe("1h ago");
    expect(timeAgo("2025-01-01T13:00:00Z")).toBe("23h ago");
  });

  it('returns "Xd ago" for 1+ days', () => {
    vi.setSystemTime(new Date("2025-01-10T12:00:00Z"));
    expect(timeAgo("2025-01-09T12:00:00Z")).toBe("1d ago");
    expect(timeAgo("2025-01-08T12:00:00Z")).toBe("2d ago");
    expect(timeAgo("2025-01-01T12:00:00Z")).toBe("9d ago");
  });
});
