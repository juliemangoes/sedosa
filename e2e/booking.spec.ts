import { test, expect, type Page } from "@playwright/test";

const OWNER_PASSWORD = "e2e-owner-pass";
let clientSeq = 0;

async function pickService(page: Page, category: string, service: string) {
  await page.goto("/");
  await page.getByRole("button", { name: `Select ${category}` }).click();
  await page.getByRole("button", { name: `Select ${service}` }).click();
}

/** Picks location "Any Available" (if asked) and the first open time. Returns the chosen time label. */
async function pickFirstTime(page: Page) {
  const any = page.getByRole("button", { name: "Select Any Available" });
  if (await any.isVisible().catch(() => false)) await any.click();
  const grid = page.locator('section[aria-label="Choose a time"]');
  const first = grid.locator("button[aria-pressed]").first();
  await expect(first).toBeVisible();
  const label = (await first.textContent())!.trim();
  await first.click();
  await page.getByRole("button", { name: "Continue" }).click();
  return label;
}

async function fillClient(page: Page, overrides: Partial<Record<"first" | "last" | "email" | "phone", string>> = {}) {
  clientSeq++;
  const email = overrides.email ?? `e2e${Date.now()}${clientSeq}@example.com`;
  await page.getByLabel("First name *").fill(overrides.first ?? "Ava");
  await page.getByLabel("Last name *").fill(overrides.last ?? `Tester${clientSeq}`);
  await page.getByLabel("Phone *").fill(overrides.phone ?? "404-555-0142");
  await page.getByLabel("Email *").fill(email);
  return email;
}

async function agreeToWaiver(page: Page) {
  await page.getByLabel(/By checking, I agree to the terms of the Consent and Liability Waiver/).check();
}

async function login(page: Page) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Password").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Appointments" })).toBeVisible();
}

test("client books a waxing service with an add-on and intake forms", async ({ page }) => {
  await pickService(page, "All Things Brows:)", "Brow Sculpt/Wax<3");
  await page.getByRole("button", { name: "Select Any Available" }).click();
  await page.getByLabel(/Jelly Mask/).check();
  const time = await pickFirstTime(page);

  await expect(page.getByText("50 minutes @ $45.00")).toBeVisible();
  await fillClient(page, { first: "Maya" });

  // Submitting without the forms shows every required question.
  await page.getByRole("button", { name: "Complete appointment" }).click();
  await expect(page.getByText("Please complete the highlighted fields.")).toBeVisible();
  await expect(page.getByText("This question is required.").first()).toBeVisible();

  for (const group of await page.locator('[role="radiogroup"]').all()) {
    await group.getByLabel("No").check();
  }
  await page.getByLabel("None of the above").check();
  await page.getByLabel(/I understand that If I begin using/).check();
  await agreeToWaiver(page);
  await page.getByRole("button", { name: "Complete appointment" }).click();

  await expect(page.getByRole("heading", { name: /You're booked, Maya/ })).toBeVisible();
  await expect(page.getByText(time).first()).toBeVisible();
  await expect(page.getByText("+ Jelly Mask ($20.00)")).toBeVisible();
  await expect(page.getByText(/Covington GA 30016|Decatur GA 30035/)).toBeVisible();
  await expect(page.getByText(/Deposit \$10\.00: not paid yet/)).toBeVisible();
  await expect(page.getByText(/non-refundable deposit is due within 24 hours/)).toBeVisible();

  const ics = await page.request.get(page.url().replace(/\?.*$/, "").replace("/booking/", "/api/bookings/") + "/ics");
  expect(ics.status()).toBe(200);
  expect(await ics.text()).toContain("SUMMARY:Brow Sculpt/Wax<3");
});

test("client reschedules and then cancels from the manage page", async ({ page }) => {
  await pickService(page, "All Things Brows:)", "Brow Sculpt/Thread");
  await pickFirstTime(page);
  await fillClient(page);
  await agreeToWaiver(page);
  await page.getByRole("button", { name: "Complete appointment" }).click();
  await expect(page.getByRole("heading", { name: /You're booked/ })).toBeVisible();
  const before = await page.locator("dd").nth(1).textContent();

  await page.getByRole("button", { name: "Reschedule" }).click();
  const slots = page.locator('section[aria-label="Choose a time"] button[aria-pressed]');
  await expect(slots.nth(3)).toBeVisible();
  await slots.nth(3).click();
  await page.getByRole("button", { name: "Confirm new time" }).click();
  await expect(page.locator("dd").nth(1)).not.toHaveText(before!);

  await page.getByRole("button", { name: "Cancel appointment" }).click();
  await page.getByRole("button", { name: "Yes, cancel" }).click();
  await expect(page.getByRole("heading", { name: "This appointment was canceled" })).toBeVisible();
});

test("two clients racing for the same slot: second is told it was taken", async ({ browser }) => {
  const a = await browser.newPage();
  const b = await browser.newPage();
  for (const p of [a, b]) {
    await pickService(p, "Waxing!", "Underarm Wax!");
    await pickFirstTime(p);
    await fillClient(p);
    for (const group of await p.locator('[role="radiogroup"]').all()) await group.getByLabel("No").check();
    await p.getByLabel("None of the above").check();
    await p.getByLabel(/I understand that If I begin using/).check();
    await agreeToWaiver(p);
  }
  await a.getByRole("button", { name: "Complete appointment" }).click();
  await expect(a.getByRole("heading", { name: /You're booked/ })).toBeVisible();
  await b.getByRole("button", { name: "Complete appointment" }).click();
  await expect(b.getByText(/just taken/)).toBeVisible();
  await expect(b.getByRole("heading", { name: "Date & Time" })).toBeVisible();
});

test("owner manages an appointment from the dashboard", async ({ page }) => {
  await pickService(page, "All Things Brows:)", "Brow Sculpt/Thread");
  await pickFirstTime(page);
  await fillClient(page, { first: "Owner", last: "Flow" });
  await agreeToWaiver(page);
  await page.getByRole("button", { name: "Complete appointment" }).click();
  await expect(page.getByRole("heading", { name: /You're booked/ })).toBeVisible();

  await login(page);
  // Deposit-due bookings are listed under "Needs attention" whatever the week.
  await page.getByRole("link", { name: "Owner Flow" }).first().click();
  await expect(page.getByRole("heading", { name: "Owner Flow" })).toBeVisible();
  await expect(page.getByText("By checking, I agree to the terms of the Consent and Liability Waiver")).toBeVisible();

  await page.getByLabel("Deposit method").selectOption("zelle");
  await page.getByRole("button", { name: "Mark paid" }).click();
  await expect(page.getByText("Deposit recorded.")).toBeVisible();
  await expect(page.getByText("Deposit paid").first()).toBeVisible();

  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText("Payment recorded.")).toBeVisible();
  await expect(page.getByText("paid in full")).toBeVisible();

  await page.getByRole("button", { name: "Completed" }).click();
  await expect(page.getByText("Marked as completed.")).toBeVisible();

  await page.getByRole("link", { name: "Messages" }).click();
  await expect(page.getByText(/Appointment confirmed: Brow Sculpt\/Thread/).first()).toBeVisible();
});

test("owner closes a day and changes a price; the booking page follows", async ({ page, request }) => {
  await login(page);

  // Close the first bookable date.
  const svc = await request.get("/api/availability?serviceId=6&locationId=any&days=1");
  const firstDate = (await svc.json()).startDate as string;
  await page.getByRole("link", { name: "Hours & time off" }).click();
  await page.locator("#ov-date").fill(firstDate);
  await page.getByLabel("Closed", { exact: true }).check();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Special hours saved.")).toBeVisible();
  const after = await (await request.get(`/api/availability?serviceId=6&locationId=any&days=1&start=${firstDate}`)).json();
  expect(after.dates[0].slots).toHaveLength(0);

  // Change a price.
  await page.getByRole("link", { name: "Services" }).click();
  await page.getByRole("link", { name: /Brow Sculpt\/Thread/ }).click();
  await page.getByLabel("Price ($)").fill("20.00");
  await page.getByRole("button", { name: "Save service" }).click();
  await expect(page.getByText("Service saved.")).toBeVisible();
  await page.goto("/");
  await page.getByRole("button", { name: "Select All Things Brows:)" }).click();
  await expect(page.getByText("30 minutes @ $20.00")).toBeVisible();
});

test("owner books a client by phone, outside regular hours @mobile", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "+ New appointment" }).click();
  await page.getByLabel("Service").selectOption({ label: "Lash Extension Removal · 30 min · $15.00" });
  const sunday = new Date();
  sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7 || 7) + 7);
  const d = sunday.toISOString().slice(0, 10);
  await page.getByLabel("Date & time").fill(`${d}T12:00`);
  await page.getByLabel("Email").fill("phone.client@example.com");
  await page.getByLabel("First name").fill("Phone");
  await page.getByLabel("Last name").fill("Client");

  // Sunday is closed, so it's refused unless the override is ticked.
  await page.getByRole("button", { name: "Book appointment" }).click();
  await expect(page.getByText(/just taken|isn't available|that time/i)).toBeVisible();
  await page.getByLabel(/Book even if outside hours/).check();
  await page.getByLabel("Date & time").fill(`${d}T12:00`);
  await page.getByLabel("Email").fill("phone.client@example.com");
  await page.getByLabel("First name").fill("Phone");
  await page.getByLabel("Last name").fill("Client");
  await page.getByRole("button", { name: "Book appointment" }).click();
  await expect(page.getByText("Appointment booked.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Phone Client" })).toBeVisible();
});

test("booking page works on a phone @phone", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("img").first()).toBeVisible();
  await page.getByRole("button", { name: "Show all appointments" }).click();
  await page.getByRole("button", { name: "Select Chin Wax!" }).click();
  await page.getByRole("button", { name: "Select Any Available" }).click();
  const grid = page.locator('section[aria-label="Choose a time"] .grid');
  await expect(grid).toHaveAttribute("style", /repeat\(3,/);
  const width = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(width).toBeLessThanOrEqual(0);
});
