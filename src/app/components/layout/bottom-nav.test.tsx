import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { BottomNav } from "./bottom-nav";

describe("BottomNav", () => {
  it("renders icon-only nav items with accessible labels", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomNav />
      </MemoryRouter>
    );
    expect(screen.getByRole("button", { name: "Map" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Feed" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Profile" })).toBeTruthy();
    expect(screen.queryByText("Map")).toBeNull();
    expect(screen.queryByText("Feed")).toBeNull();
    expect(screen.queryByText("Submit")).toBeNull();
    expect(screen.queryByText("Profile")).toBeNull();
  });

  it("highlights active route", () => {
    render(
      <MemoryRouter initialEntries={["/feed"]}>
        <BottomNav />
      </MemoryRouter>
    );

    const feedButton = screen.getByRole("button", { name: "Feed" });
    const feedIcon = feedButton.querySelector(".bottom-nav-icon");
    expect(feedIcon?.getAttribute("class")).toContain("text-accent");
    expect(feedButton.className).toContain("bottom-nav-item-active");
    expect(feedButton.getAttribute("aria-current")).toBe("page");
  });

  it("applies inactive style to non-active routes", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomNav />
      </MemoryRouter>
    );

    const feedButton = screen.getByRole("button", { name: "Feed" });
    const feedIcon = feedButton.querySelector(".bottom-nav-icon");
    expect(feedIcon?.getAttribute("class")).toContain("text-text-muted");
    const mapButton = screen.getByRole("button", { name: "Map" });
    expect(mapButton.className).toContain("bottom-nav-item-active");
  });
});
