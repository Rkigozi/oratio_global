import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "https://oratiotest.netlify.app",
    headless: true,
  },
  webServer: undefined,
});
