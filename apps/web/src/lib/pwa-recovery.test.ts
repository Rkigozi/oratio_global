import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isModuleScriptLoadError,
  recoverFromModuleScriptLoadError,
  shouldWaitForConnectionBeforeRecovery,
} from "./pwa-recovery";

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value,
  });
}

describe("isModuleScriptLoadError", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setNavigatorOnline(true);
  });

  afterEach(() => {
    window.sessionStorage.clear();
    setNavigatorOnline(true);
  });

  it("detects iOS module script import failures", () => {
    expect(isModuleScriptLoadError("Unexpected - importing a module script failed.")).toBe(true);
  });

  it("detects dynamic import chunk failures", () => {
    expect(
      isModuleScriptLoadError(new TypeError("Failed to fetch dynamically imported module")),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isModuleScriptLoadError(new Error("Profile save failed"))).toBe(false);
  });

  it("waits for the network before attempting module recovery", async () => {
    setNavigatorOnline(false);

    expect(shouldWaitForConnectionBeforeRecovery()).toBe(true);
    await expect(
      recoverFromModuleScriptLoadError("Unexpected - importing a module script failed."),
    ).resolves.toBe(false);
  });
});
