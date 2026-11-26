import { defineConfig, devices } from "@playwright/test";

/*
 * E2E suite against the Expo web build: the smoke tests (every tab renders)
 * and the core reading path (e2e/reader.spec.ts). The native file picker and
 * the native WebView are not exercised here; they need a device.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:8090",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx expo start --web --port 8090",
    url: "http://localhost:8090",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000, // first web bundle is slow
  },
});
