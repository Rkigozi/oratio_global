import { describe, it, expect } from "vitest";
import { detectLanguage, needsTranslation } from "./translate";

describe("detectLanguage", () => {
  it("detects Spanish via accented characters", () => {
    expect(detectLanguage("áéíóúüñ")).toBe("es");
    expect(detectLanguage("¿Cómo estás?")).toBe("es");
  });

  it("detects Spanish via common words", () => {
    expect(detectLanguage("por los las que del")).toBe("es");
    expect(detectLanguage("Señor Dios padre")).toBe("es");
  });

  it("detects French via accented characters", () => {
    expect(detectLanguage("très bien")).toBe("fr");
  });

  it("detects French via common words", () => {
    expect(detectLanguage("Je suis avec vous")).toBe("fr");
    expect(detectLanguage("dans sur tout nous")).toBe("fr");
  });

  it("detects Portuguese via accented characters", () => {
    expect(detectLanguage("amanhã")).toBe("pt");
  });

  it("detects Portuguese via common words", () => {
    expect(detectLanguage("senhor com")).toBe("pt");
    expect(detectLanguage("dos seu")).toBe("pt");
  });

  it("detects German via common words", () => {
    expect(detectLanguage("Herr Gott Vater")).toBe("de");
    expect(detectLanguage("auf ich du wir")).toBe("de");
  });

  it("detects Italian via common words", () => {
    expect(detectLanguage("Signore per che gli")).toBe("it");
    expect(detectLanguage("sul nel alla")).toBe("it");
  });

  it("defaults to English for unknown", () => {
    expect(detectLanguage("Lord God please help me")).toBe("en");
    expect(detectLanguage("")).toBe("en");
    expect(detectLanguage("12345")).toBe("en");
  });
});

describe("needsTranslation", () => {
  it("returns false when text language matches user language", () => {
    expect(needsTranslation("Hello world", "en")).toBe(false);
  });

  it("returns true when text language differs from user language", () => {
    expect(needsTranslation("¿Cómo estás?", "en")).toBe(true);
    expect(needsTranslation("éèêëàâùûüç", "en")).toBe(true);
  });
});
