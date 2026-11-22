import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "off" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, grepInvert: /@phone/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile|@phone/ },
  ],
  webServer: {
    // Production build against a throwaway embedded database.
    command: `node -e "require('fs').rmSync('.data/e2e',{recursive:true,force:true})" && npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: "pglite://.data/e2e",
      ADMIN_PASSWORD: "e2e-owner-pass",
      SESSION_SECRET: "e2e-session-secret-0123456789",
      APP_URL: `http://localhost:${PORT}`,
      STRIPE_SECRET_KEY: "",
      RESEND_API_KEY: "",
      TWILIO_ACCOUNT_SID: "",
      // Shows sign-in codes on screen because the test server has no email provider. Never set in production.
      DEV_LOGIN_CODES: "1",
    },
  },
});
