import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { BottomNav } from "./bottom-nav";

describe("BottomNav", () => {
  it("renders all nav items", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomNav />
      </MemoryRouter>
    );
    expect(screen.getByText("Map")).toBeTruthy();
    expect(screen.getByText("Feed")).toBeTruthy();
    expect(screen.getByText("Submit")).toBeTruthy();
    expect(screen.getByText("Profile")).toBeTruthy();
  });

  it("highlights active route", () => {
    render(
      <MemoryRouter initialEntries={["/feed"]}>
        <BottomNav />
      </MemoryRouter>
    );

    const feedButton = screen.getByText("Feed");
    expect(feedButton.className).toContain("text-accent");
  });

  it("applies inactive style to non-active routes", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomNav />
      </MemoryRouter>
    );

    const feedButton = screen.getByText("Feed");
    expect(feedButton.className).toContain("text-text-muted");
    const mapButton = screen.getByText("Map");
    expect(mapButton.className).toContain("text-accent");
  });
});
