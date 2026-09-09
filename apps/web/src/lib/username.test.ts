import { describe, it, expect } from "vitest";
import { generateUsernameFromDisplayName } from "./username";

describe("generateUsernameFromDisplayName", () => {
  it("lowercases the input", () => {
    expect(generateUsernameFromDisplayName("John Doe")).toBe("john_doe");
  });

  it("replaces non-alphanumeric chars with underscores", () => {
    const result = generateUsernameFromDisplayName("Hello World!");
    expect(result).toContain("hello_world");
  });

  it("collapses consecutive underscores", () => {
    expect(generateUsernameFromDisplayName("a   b")).toBe("a_b");
  });

  it("collapses consecutive dots", () => {
    expect(generateUsernameFromDisplayName("a...b")).toBe("a.b");
  });

  it("trims leading/trailing underscores and dots", () => {
    expect(generateUsernameFromDisplayName("__john__")).toBe("john");
    expect(generateUsernameFromDisplayName("..john..")).toBe("john");
  });

  it("allows underscores and dots in the middle", () => {
    expect(generateUsernameFromDisplayName("john.doe_123")).toBe("john.doe_123");
  });

  it("truncates to 30 characters", () => {
    const long = "a".repeat(50);
    const result = generateUsernameFromDisplayName(long);
    expect(result.length).toBeLessThanOrEqual(30);
  });

  it("handles empty string", () => {
    expect(generateUsernameFromDisplayName("")).toBe("");
  });

  it("replaces accented characters with underscores", () => {
    const result = generateUsernameFromDisplayName("José María");
    expect(result).not.toContain("é");
    expect(result).not.toContain("í");
  });
});
