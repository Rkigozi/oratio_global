import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CrisisResources } from "./crisis-resources";

describe("CrisisResources", () => {
  it("renders collapsed by default", () => {
    render(<CrisisResources />);
    expect(screen.getByText(/you're not alone/)).toBeTruthy();
    expect(screen.queryByText("Find A Helpline")).toBeNull();
  });

  it("expands to show resources on click", () => {
    render(<CrisisResources />);
    fireEvent.click(screen.getByText(/you're not alone/));
    expect(screen.getByText("Find A Helpline")).toBeTruthy();
    expect(screen.getByText("Befrienders Worldwide")).toBeTruthy();
  });

  it("contains external links with correct URLs", () => {
    render(<CrisisResources />);
    fireEvent.click(screen.getByText(/you're not alone/));
    const link = screen.getByText("Find A Helpline").closest("a");
    expect(link?.getAttribute("href")).toBe("https://findahelpline.com/");
    expect(link?.getAttribute("target")).toBe("_blank");
  });
});
