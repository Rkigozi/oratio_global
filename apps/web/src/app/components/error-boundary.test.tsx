import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "./error-boundary";

vi.spyOn(console, "error").mockImplementation(() => {});

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Hello</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Hello")).toBeTruthy();
  });

  it("renders fallback UI on error", () => {
    const Bomb = () => { throw new Error("💥"); };

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("renders custom fallback when provided", () => {
    const Bomb = () => { throw new Error("💥"); };

    render(
      <ErrorBoundary fallback={<div>Custom error</div>}>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom error")).toBeTruthy();
  });

  it("resets error state when clicking Try again", () => {
    function TestApp() {
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <div>
          <button onClick={() => setShouldThrow(false)}>Fix it</button>
          <ErrorBoundary>
            {shouldThrow ? <ThrowComp /> : <div>Recovered</div>}
          </ErrorBoundary>
        </div>
      );
    }
    function ThrowComp(): never { throw new Error("💥"); }

    render(<TestApp />);
    expect(screen.getByText("Something went wrong")).toBeTruthy();

    fireEvent.click(screen.getByText("Fix it"));
    fireEvent.click(screen.getByText("Try again"));

    expect(screen.getByText("Recovered")).toBeTruthy();
  });
});
