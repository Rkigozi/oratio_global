import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { PrayerRow } from "./prayer-row";
import type { PrayerRequest } from "../data/prayer-data";

const mockPrayer: PrayerRequest = {
  id: "p1",
  city: "London",
  country: "UK",
  text: "Healing for my family #healing",
  username: "testuser",
  prayerCount: 3,
  lat: 51.5,
  lng: -0.1,
  category: "Health",
  createdAt: new Date().toISOString(),
};

describe("PrayerRow", () => {
  it("renders prayer text and city", () => {
    render(
      <MemoryRouter>
        <PrayerRow
          prayer={mockPrayer}
          index={0}
          showCount={false}
          canManage={false}
          onTap={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/Healing for my family/)).toBeTruthy();
    expect(screen.getByText("London")).toBeTruthy();
  });

  it("renders category badge", () => {
    render(
      <MemoryRouter>
        <PrayerRow
          prayer={mockPrayer}
          index={0}
          showCount={false}
          canManage={false}
          onTap={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("Health")).toBeTruthy();
  });

  it("shows prayer count when showCount is true", () => {
    render(
      <MemoryRouter>
        <PrayerRow
          prayer={mockPrayer}
          index={0}
          showCount={true}
          canManage={false}
          onTap={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("shows delete button when canManage is true", () => {
    render(
      <MemoryRouter>
        <PrayerRow
          prayer={mockPrayer}
          index={0}
          showCount={false}
          canManage={true}
          onTap={vi.fn()}
          onDelete={vi.fn()}
        />
      </MemoryRouter>
    );
    const deleteBtn = screen.getByTitle("Delete prayer");
    expect(deleteBtn).toBeTruthy();
  });

  it("calls onDelete when delete is clicked", () => {
    const onDelete = vi.fn();
    render(
      <MemoryRouter>
        <PrayerRow
          prayer={mockPrayer}
          index={0}
          showCount={false}
          canManage={true}
          onTap={vi.fn()}
          onDelete={onDelete}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle("Delete prayer"));
    expect(onDelete).toHaveBeenCalledWith("p1");
  });

  it("calls onTogglePrayed when pray button is clicked", () => {
    const onTogglePrayed = vi.fn();
    render(
      <MemoryRouter>
        <PrayerRow
          prayer={mockPrayer}
          index={0}
          showCount={false}
          canManage={false}
          onTap={vi.fn()}
          showPrayedToggle={true}
          onTogglePrayed={onTogglePrayed}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle("Pray"));
    expect(onTogglePrayed).toHaveBeenCalledWith("p1");
  });
});
