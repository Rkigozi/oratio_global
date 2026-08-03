import { defineConfig } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173';
const shouldStartLocalServer = !process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL,
    headless: true,
  },
  webServer: shouldStartLocalServer
    ? {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120000,
      }
    : undefined,
});
