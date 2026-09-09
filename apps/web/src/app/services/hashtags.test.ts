import { describe, it, expect } from "vitest";
import { extractHashtags, getHashtagCounts } from "./hashtags";

describe("extractHashtags", () => {
  it("extracts single hashtag", () => {
    expect(extractHashtags("praying for #healing")).toEqual(["#healing"]);
  });

  it("extracts multiple hashtags", () => {
    expect(extractHashtags("#healing and #hope for #peace")).toEqual(["#healing", "#hope", "#peace"]);
  });

  it("returns empty array when no hashtags", () => {
    expect(extractHashtags("just a normal prayer")).toEqual([]);
  });

  it("deduplicates hashtags", () => {
    expect(extractHashtags("#healing is needed #healing today")).toEqual(["#healing"]);
  });

  it("lowercases hashtags", () => {
    expect(extractHashtags("#Healing and #HOPE")).toEqual(["#healing", "#hope"]);
  });

  it("handles hashtags with underscores", () => {
    expect(extractHashtags("#mental_health")).toEqual(["#mental_health"]);
  });

  it("handles hashtags with numbers", () => {
    expect(extractHashtags("#pray4peace")).toEqual(["#pray4peace"]);
  });
});

describe("getHashtagCounts", () => {
  it("counts hashtags across prayers", () => {
    const prayers = [
      { text: "#healing for my mom" },
      { text: "#healing and #hope" },
      { text: "#hope is alive" },
    ];
    const counts = getHashtagCounts(prayers);
    expect(counts).toContainEqual({ tag: "#healing", count: 2 });
    expect(counts).toContainEqual({ tag: "#hope", count: 2 });
  });

  it("returns empty for no hashtags", () => {
    expect(getHashtagCounts([{ text: "no tags" }])).toEqual([]);
  });

  it("sorts by count descending", () => {
    const prayers = [
      { text: "#a" },
      { text: "#a" },
      { text: "#a" },
      { text: "#b" },
      { text: "#b" },
    ];
    const counts = getHashtagCounts(prayers);
    expect(counts[0].tag).toBe("#a");
    expect(counts[0].count).toBe(3);
  });

  it("limits to top 10", () => {
    const prayers = Array.from({ length: 15 }, (_, i) => ({
      text: `#tag${i}`,
    }));
    expect(getHashtagCounts(prayers).length).toBeLessThanOrEqual(10);
  });
});
