import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  reporter: process.env.CI ? [["list"], ["html", { outputFolder: "playwright-report" }]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`,
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm dev -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
    },
  },
});
