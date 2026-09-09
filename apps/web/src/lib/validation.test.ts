import { describe, it, expect } from "vitest";
import { validatePrayerSubmission, sanitizePrayerText } from "./validation";

describe("validatePrayerSubmission", () => {
  it("validates a correct prayer submission", () => {
    const result = validatePrayerSubmission({
      text: "Please pray for my healing",
      location: "London, UK",
      category: "Health",
      anonymous: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects text shorter than 10 characters", () => {
    const result = validatePrayerSubmission({
      text: "Short",
      location: "London, UK",
      category: "Health",
      anonymous: false,
    });
    expect(result.success).toBe(false);
    expect(result.errors?.text).toBeDefined();
  });

  it("rejects text longer than 500 characters", () => {
    const result = validatePrayerSubmission({
      text: "a".repeat(501),
      location: "London, UK",
      category: "Health",
      anonymous: false,
    });
    expect(result.success).toBe(false);
  });

  it("allows empty location (optional field)", () => {
    const result = validatePrayerSubmission({
      text: "Please pray for my healing",
      location: "",
      category: "Health",
      anonymous: false,
    });
    expect(result.success).toBe(true);
  });

  it("allows emoji in prayer text", () => {
    const result = validatePrayerSubmission({
      text: "Please pray for peace 🙏🏾 ❤️‍🔥",
      location: "London, UK",
      category: "Peace",
      anonymous: false,
    });

    expect(result.success).toBe(true);
  });

  it("rejects angle brackets in prayer text", () => {
    const result = validatePrayerSubmission({
      text: "Please pray <script>alert(1)</script> 🙏",
      location: "London, UK",
      category: "Health",
      anonymous: false,
    });

    expect(result.success).toBe(false);
    expect(result.errors?.text).toBe("Remove angle brackets from your prayer");
  });
});

describe("sanitizePrayerText", () => {
  it("removes HTML tags but keeps text", () => {
    expect(sanitizePrayerText("<b>Pray</b> for me")).toBe("Pray for me");
  });

  it("trims whitespace", () => {
    expect(sanitizePrayerText("  Pray for me  ")).toBe("Pray for me");
  });

  it("keeps emoji sequences", () => {
    expect(sanitizePrayerText("Please pray 🙏🏾 ❤️‍🔥")).toBe("Please pray 🙏🏾 ❤️‍🔥");
  });

  it("limits to 500 characters", () => {
    const long = "a".repeat(600);
    expect(sanitizePrayerText(long).length).toBe(500);
  });
});
