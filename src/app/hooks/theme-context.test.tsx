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
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    vi.clearAllMocks();
  });

  it("provides default dark theme", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    expect(result.current.theme).toBe("dark");
  });

  it("reads stored theme from localStorage", () => {
    localStorage.setItem("oratio_theme", "light");
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
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

    expect(result.current.theme).toBe("dark");
    expect(localStorage.getItem("oratio_theme")).toBe("dark");
  });

  it("returns default theme when used outside provider", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });
});
