import { afterEach, describe, it, expect, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { LoadingSpinner, ErrorState, FullPageLoadingSpinner } from "./loading-spinner";

describe("LoadingSpinner", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders with default text", () => {
    render(<LoadingSpinner delayMs={0} />);
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("renders with custom text", () => {
    render(<LoadingSpinner text="Fetching prayers..." delayMs={0} />);
    expect(screen.getByText("Fetching prayers...")).toBeTruthy();
  });

  it("waits briefly before showing the loading state", () => {
    vi.useFakeTimers();

    render(<LoadingSpinner text="Fetching prayers..." />);
    expect(screen.queryByText("Fetching prayers...")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(180);
    });

    expect(screen.getByText("Fetching prayers...")).toBeTruthy();
  });

  it("uses the same delay for full-page route loading", () => {
    vi.useFakeTimers();

    render(<FullPageLoadingSpinner />);
    expect(screen.queryByRole("status", { name: "Loading" })).toBeNull();

    act(() => {
      vi.advanceTimersByTime(180);
    });

    expect(screen.getByRole("status", { name: "Loading" })).toBeTruthy();
  });
});

describe("ErrorState", () => {
  it("renders default message", () => {
    render(<ErrorState />);
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Please try again later")).toBeTruthy();
  });

  it("renders custom message", () => {
    render(<ErrorState message="Custom error" />);
    expect(screen.getByText("Custom error")).toBeTruthy();
  });

  it("shows retry button when onRetry provided", () => {
    const onRetry = () => {};
    render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByText("Try Again")).toBeTruthy();
  });

  it("hides retry button when onRetry not provided", () => {
    render(<ErrorState />);
    expect(screen.queryByText("Try Again")).toBeNull();
  });
});
