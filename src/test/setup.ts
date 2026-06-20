import "@testing-library/jest-dom";
import { vi } from "vitest";

// jsdom does not implement GeolocationPositionError
class MockGeolocationPositionError extends Error {
  code = 0;
  static PERMISSION_DENIED = 1;
  static POSITION_UNAVAILABLE = 2;
  static TIMEOUT = 3;
}
Object.defineProperty(globalThis, "GeolocationPositionError", {
  value: MockGeolocationPositionError,
});

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

vi.mock("@sentry/react", () => ({
  captureException: vi.fn(),
}));

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: vi.fn().mockReturnValue({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
