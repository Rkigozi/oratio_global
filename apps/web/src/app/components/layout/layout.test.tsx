import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Layout } from "./layout";

vi.mock("./header", () => ({
  Header: () => <div data-testid="mock-header">Header</div>,
}));

vi.mock("./bottom-nav", () => ({
  BottomNav: () => <div data-testid="mock-bottom-nav">BottomNav</div>,
}));

describe("Layout", () => {
  it("renders header and bottom nav", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Layout />
      </MemoryRouter>
    );
    expect(screen.getByTestId("mock-header")).toBeTruthy();
    expect(screen.getByTestId("mock-bottom-nav")).toBeTruthy();
  });
});
