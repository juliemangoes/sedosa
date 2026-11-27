import { defineConfig, devices } from "@playwright/test";

/**
 * The end-to-end suite against the Cloudflare Worker build, running in local workerd:
 *   1. a scratch Postgres database:  DATABASE_URL=postgresql://… npm run db:setup
 *   2. .dev.vars with DATABASE_URL (same database), ADMIN_PASSWORD=e2e-owner-pass,
 *      SESSION_SECRET (16+ characters) and APP_URL=http://localhost:8787
 *   3. npm run cf:build && npx wrangler dev --port 8787
 *   4. npx playwright test -c playwright.workers.config.ts
 * Sign-in codes are never shown on screen on Cloudflare, so the two tests that read them are skipped.
 */
const needsCodes = "client account: create from a booking|account pages are accessible";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:8787", trace: "off" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, grepInvert: new RegExp(`@phone|${needsCodes}`) },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile|@phone/ },
  ],
});
