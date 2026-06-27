import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./theme-context";

vi.mock("../services/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
    }),
  },
}));

describe("ThemeProvider", () => {
  const matchMediaMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: matchMediaMock,
    });
    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.clearAllMocks();
  });

  it("defaults to system mode with resolved dark theme", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    expect(result.current.themeMode).toBe("system");
    expect(result.current.theme).toBe("dark");
  });

  it("reads stored theme mode from localStorage", () => {
    localStorage.setItem("oratio_theme", "light");
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    expect(result.current.themeMode).toBe("light");
    expect(result.current.theme).toBe("light");
  });

  it("applies theme to document element", () => {
    render(<ThemeProvider><div>test</div></ThemeProvider>);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("toggles theme from dark to light", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    expect(result.current.theme).toBe("dark");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.themeMode).toBe("light");
    expect(result.current.theme).toBe("light");
    expect(localStorage.getItem("oratio_theme")).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("toggles theme from light to dark", () => {
    localStorage.setItem("oratio_theme", "light");
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    expect(result.current.theme).toBe("light");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.themeMode).toBe("dark");
    expect(result.current.theme).toBe("dark");
    expect(localStorage.getItem("oratio_theme")).toBe("dark");
  });

  it("can explicitly follow the light system theme", () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: light)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    expect(result.current.themeMode).toBe("system");
    expect(result.current.theme).toBe("light");
  });

  it("returns default theme when used outside provider", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.themeMode).toBe("system");
    expect(result.current.theme).toBe("dark");
  });
});
