import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGeolocation } from "./use-geolocation";

function mockGeolocation(getCurrentPosition: (success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) => void) {
  Object.defineProperty(navigator, "geolocation", {
    value: { getCurrentPosition },
    writable: true,
    configurable: true,
  });
}

function mockFetch(response: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(response),
  } as Response);
}

describe("useGeolocation", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("returns initial state", () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.location).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.denied).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("loads cached location from sessionStorage", () => {
    const cached = { city: "London", country: "United Kingdom", lat: 51.5, lng: -0.1 };
    sessionStorage.setItem("oratio_location", JSON.stringify(cached));
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.location).toEqual(cached);
  });

  it("handles successful geolocation", async () => {
    mockGeolocation((success) => {
      success({
        coords: {
          latitude: 51.5,
          longitude: -0.1,
          accuracy: 100,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    });

    const fetchSpy = mockFetch({
      address: { city: "London", country: "United Kingdom" },
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.requestLocation();
    });

    expect(result.current.location).toEqual({
      city: "London",
      country: "United Kingdom",
      lat: 51.5,
      lng: -0.1,
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetchSpy).toHaveBeenCalledOnce();

    const cached = sessionStorage.getItem("oratio_location");
    expect(cached).toBeTruthy();
  });

  it("handles permission denied", async () => {
    mockGeolocation((_success, error) => {
      if (error) {
        const err = new GeolocationPositionError();
        err.code = GeolocationPositionError.PERMISSION_DENIED;
        err.message = "User denied geolocation";
        error(err);
      }
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.requestLocation();
    });

    expect(result.current.location).toBeNull();
    expect(result.current.denied).toBe(true);
    expect(result.current.error).toBe("permission");
  });

  it("handles timeout", async () => {
    mockGeolocation((_success, error) => {
      if (error) {
        const err = new GeolocationPositionError();
        err.code = GeolocationPositionError.TIMEOUT;
        err.message = "Geolocation timed out";
        error(err);
      }
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.requestLocation();
    });

    expect(result.current.error).toBe("timeout");
  });

  it("handles generic error", async () => {
    mockGeolocation((_success, error) => {
      if (error) {
        const err = new GeolocationPositionError();
        err.code = GeolocationPositionError.POSITION_UNAVAILABLE;
        err.message = "Position unavailable";
        error(err);
      }
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.requestLocation();
    });

    expect(result.current.error).toBe("error");
  });

  it("resetDenied clears error state", async () => {
    mockGeolocation((_success, error) => {
      if (error) {
        const err = new GeolocationPositionError();
        err.code = GeolocationPositionError.PERMISSION_DENIED;
        error(err);
      }
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.requestLocation();
    });

    expect(result.current.denied).toBe(true);

    act(() => {
      result.current.resetDenied();
    });

    expect(result.current.denied).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
