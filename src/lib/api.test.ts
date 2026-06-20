import { describe, it, expect, vi, beforeEach } from "vitest";
import { reportContent } from "./api";

vi.mock("./supabase-queries", () => ({
  createReport: vi.fn(),
  getPendingReports: vi.fn(),
  resolveReport: vi.fn(),
}));

import { createReport } from "./supabase-queries";

describe("reportContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error null on success", async () => {
    vi.mocked(createReport).mockResolvedValue(true);
    const result = await reportContent({
      reportable_type: "prayer",
      reportable_id: "prayer-1",
      reason: "Inappropriate content",
    });
    expect(result.error).toBeNull();
    expect(createReport).toHaveBeenCalledWith({
      reportable_type: "prayer",
      reportable_id: "prayer-1",
      reason: "Inappropriate content",
    });
  });

  it("returns error on failure", async () => {
    vi.mocked(createReport).mockResolvedValue(false);
    const result = await reportContent({
      reportable_type: "comment",
      reportable_id: "comment-1",
      reason: "Spam",
    });
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe("Failed to create report");
  });
});
