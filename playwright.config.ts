import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "iphone-13", use: { ...devices["iPhone 13"] } },
  ],
  webServer: process.env.SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run build && npm run start",
        port: 3000,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});
