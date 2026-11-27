import { test, expect, type Page } from "@playwright/test";

const OWNER_PASSWORD = "e2e-owner-pass";
let clientSeq = 0;

/** From the landing page menu, find a service with the search box and press "Book" (names show "<3" as "♡"). */
async function pickService(page: Page, service: string) {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search services" }).fill(service.replace(/ ♡$/, ""));
  await page.getByRole("button", { name: `Book ${service}`, exact: true }).click();
}

/** Picks "Any available" (when asked) and an open time. Returns the time label, e.g. "9:30 AM". */
async function pickTime(page: Page, index = 0, dayOffset = 0) {
  const any = page.getByRole("button", { name: "Select Any available" });
  if (await any.isVisible().catch(() => false)) await any.click();
  if (dayOffset) {
    const day = page.locator('section[aria-label="Choose a time"] [data-day]:not([disabled])').nth(dayOffset);
    await expect(day).toBeVisible();
    await day.click();
  }
  const slot = page.locator('section[aria-label="Choose a time"] [data-slot]').nth(index);
  await expect(slot).toBeVisible();
  const label = (await slot.textContent())!.trim();
  await slot.click();
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(page.getByRole("heading", { name: "Almost done" })).toBeVisible();
  return label;
}

async function fillClient(page: Page, o: Partial<Record<"first" | "last" | "email" | "phone", string>> = {}) {
  clientSeq++;
  const email = o.email ?? `e2e${Date.now()}${clientSeq}@example.com`;
  await page.getByLabel("First name", { exact: true }).fill(o.first ?? "Ava");
  await page.getByLabel("Last name", { exact: true }).fill(o.last ?? `Tester${clientSeq}`);
  await page.getByLabel("Mobile number").fill(o.phone ?? "404-555-0142");
  await page.getByLabel("Email", { exact: true }).fill(email);
  return email;
}

async function agreeToWaiver(page: Page) {
  await page.getByText(/By checking, I agree to the terms of the Consent and Liability Waiver/).click();
}

async function answerWaxingForm(page: Page) {
  for (const group of await page.locator('[role="radiogroup"]').all()) await group.getByText("No", { exact: true }).click();
  await page.getByText("None of the above", { exact: true }).click();
  await page.getByText(/I understand that If I begin using/).click();
}

async function login(page: Page) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Password").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening)/ })).toBeVisible();
}

/** Dashboard: open a client's most recent appointment via the Clients list. */
async function openClientAppointment(page: Page, name: string) {
  await page.goto(`/admin/clients?q=${encodeURIComponent(name)}`);
  await page.getByRole("link", { name: new RegExp(name) }).first().click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await page.locator('main a[href^="/admin/appointments/"]:not([href*="/new"])').first().click();
  await page.waitForURL(/\/admin\/appointments\/[0-9a-f-]{36}/);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Calendar" })).toBeVisible();
}

test("landing page: category cards, search and details sheet", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Sedosa Beauty Studio" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Booking policies" })).toBeAttached();
  const tabs = page.getByRole("tablist", { name: "Service categories" });
  const panel = page.locator("#menu-panel");

  // "Meet your artist" falls back to a studio welcome until the owner writes an intro.
  await expect(page.getByRole("heading", { name: "Welcome to the studio" })).toBeVisible();

  // Choosing a category card selects it and brings its services into view.
  await tabs.getByRole("tab", { name: /Waxing/ }).click();
  await expect(tabs.getByRole("tab", { name: /Waxing/ })).toHaveAttribute("aria-selected", "true");
  await expect(panel.getByRole("heading", { name: "Waxing", level: 3 })).toBeInViewport();
  await expect(panel.getByRole("button", { name: "Book Chin Wax!" })).toBeVisible();

  // Picking another card swaps the menu below it.
  await tabs.getByRole("tab", { name: /Korean Lash Lifts/ }).click();
  await expect(tabs.getByRole("tab", { name: /Korean Lash Lifts/ })).toHaveAttribute("aria-selected", "true");
  await expect(tabs.getByRole("tab", { name: /Waxing/ })).toHaveAttribute("aria-selected", "false");
  await expect(panel.getByRole("heading", { name: "Korean Lash Lifts", level: 3 })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Book Chin Wax!" })).toHaveCount(0);
  // "Next" moves through the categories in order.
  await panel.getByRole("button", { name: /^Next: / }).click();
  await expect(tabs.getByRole("tab", { selected: true })).not.toHaveAccessibleName(/Korean Lash Lifts/);

  // Search looks across every category.
  const search = page.getByRole("searchbox", { name: "Search services" });
  await search.fill("wax");
  await expect(panel.getByRole("button", { name: "Book Chin Wax!" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Book Brow Sculpt/Wax ♡" })).toBeVisible();
  await search.fill("lami");
  await expect(page.getByRole("button", { name: "Book Brow Lami Set ♡" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Book Chin Wax!" })).toHaveCount(0);
  await search.fill("zzz");
  await expect(page.getByText("No services match")).toBeVisible();
  await page.getByRole("button", { name: "Show all services" }).click();
  await expect(tabs.getByRole("tab", { selected: true })).toBeVisible();

  // Details sheet, then book from it.
  await search.fill("lami");
  await page.getByRole("button", { name: "Brow Lami Set ♡, details" }).click();
  const sheet = page.getByRole("dialog", { name: "Brow Lami Set ♡" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText(/\$10 non-refundable deposit/)).toBeVisible();
  await expect(sheet.getByText("Add-ons you can include")).toBeVisible();
  await expect(sheet.getByText(/consent forms when you book/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await page.getByRole("button", { name: "Brow Lami Set ♡, details" }).click();
  await sheet.getByRole("button", { name: "Book this service" }).click();
  await expect(page.getByRole("heading", { name: "Choose a studio" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");

  // Street addresses are not published before booking.
  await page.goto("/");
  expect(await page.content()).not.toContain("2843 Fairview");
});

test("client account: create from a booking, sign in with a code, rebook with saved answers", async ({ page }) => {
  const email = `acct${Date.now()}@example.com`;
  await pickService(page, "Underarm Wax!");
  await pickTime(page);
  await fillClient(page, { first: "Jada", last: "Moore", email });
  await answerWaxingForm(page);
  await agreeToWaiver(page);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: /You're booked, Jada/ })).toBeVisible();

  await page.getByRole("link", { name: "Create my account" }).click();
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await page.getByRole("button", { name: /Email me a code/ }).click();
  const hint = await page.getByText(/here's the code for testing/).textContent();
  const code = hint!.match(/(\d{6})/)![1];
  // A wrong code is rejected first.
  await page.getByLabel("6-digit code").fill(code === "000000" ? "111111" : "000000");
  await expect(page.getByText(/doesn't match/)).toBeVisible();
  await page.getByLabel("6-digit code").fill(code);
  await expect(page.getByRole("heading", { name: "Hi, Jada" })).toBeVisible();
  await expect(page.getByText("Underarm Wax!")).toBeVisible();
  await expect(page.getByRole("link", { name: "Manage" })).toBeVisible();

  await page.getByLabel("Mobile number").fill("4045550199");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  // Booking again: details and previous answers are filled in; consent must be re-ticked.
  await page.goto("/");
  await expect(page.getByRole("link", { name: /My account, signed in as Jada/ })).toBeVisible();
  await pickService(page, "Underarm Wax!");
  await pickTime(page, 3);
  await expect(page.getByRole("heading", { name: "Booking as Jada" })).toBeVisible();
  await expect(page.getByLabel("Mobile number")).toHaveValue("(404) 555-0199");
  await expect(page.getByText(/filled in your answers from last time/)).toBeVisible();
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByText(/1 thing still needs your attention|2 things still need your attention/)).toBeVisible();
  await page.getByText(/I understand that If I begin using/).click();
  await agreeToWaiver(page);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: /You're booked, Jada/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "My appointments" })).toBeVisible();

  await page.goto("/account");
  await expect(page.getByText("You have 2 upcoming appointments.")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in or create your account" })).toBeVisible();
});

test("client books a waxing service with an add-on and intake forms", async ({ page }) => {
  await pickService(page, "Brow Sculpt/Wax ♡");
  await page.getByRole("button", { name: "Select Any available" }).click();
  await page.getByText("Jelly Mask", { exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Appointment summary" }).getByText("50 min")).toBeVisible();
  const time = await pickTime(page);

  await fillClient(page, { first: "Maya" });
  await expect(page.getByLabel("Mobile number")).toHaveValue("(404) 555-0142");

  // Submitting without the forms flags every required question.
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByText(/Almost there: \d+ things still need your attention/)).toBeVisible();
  await expect(page.getByText("Please answer this question.").first()).toBeVisible();

  await answerWaxingForm(page);
  await agreeToWaiver(page);
  await page.getByRole("button", { name: "Confirm booking" }).click();

  await expect(page.getByRole("heading", { name: /You're booked, Maya/ })).toBeVisible();
  await expect(page.getByTestId("appt-when")).toContainText(time.replace(/ (AM|PM)$/, ""));
  await expect(page.getByText("+ Jelly Mask")).toBeVisible();
  await expect(page.getByText(/Covington GA 30016|Decatur GA 30035/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Get directions/ })).toBeVisible();
  await expect(page.getByText("Deposit $10.00 not paid yet")).toBeVisible();
  await expect(page.getByText(/non-refundable deposit is due within 24 hours/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Get ready for your appointment" })).toBeVisible();

  const ics = await page.request.get(page.url().replace(/\?.*$/, "").replace("/booking/", "/api/bookings/") + "/ics");
  expect(ics.status()).toBe(200);
  expect(await ics.text()).toContain("SUMMARY:Brow Sculpt/Wax<3");
});

test("returning client is remembered; reschedule then cancel", async ({ page }) => {
  await pickService(page, "Brow Sculpt/Thread");
  await pickTime(page, 0, 3);
  await fillClient(page, { first: "Rae", email: "rae.returning@example.com" });
  await agreeToWaiver(page);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: /You're booked/ })).toBeVisible();
  const before = await page.getByTestId("appt-when").textContent();

  await page.getByRole("button", { name: "Reschedule" }).click();
  // Move it a few days out too, so online cancellation (24-hour cutoff) stays open.
  await page.locator('section[aria-label="Choose a time"] [data-day]:not([disabled])').nth(4).click();
  const slots = page.locator('section[aria-label="Choose a time"] [data-slot]');
  await expect(slots.nth(3)).toBeVisible();
  await slots.nth(3).click();
  await page.getByRole("button", { name: "Confirm new time" }).click();
  await expect(page.getByText(/You're all set for/)).toBeVisible();
  await expect(page.getByTestId("appt-when")).not.toHaveText(before!);

  await page.getByRole("button", { name: "Cancel appointment" }).click();
  await page.getByRole("button", { name: "Yes, cancel" }).click();
  await expect(page.getByRole("heading", { name: "This appointment was canceled" })).toBeVisible();

  // Details are prefilled next time.
  await pickService(page, "Lash Extension Removal");
  await pickTime(page);
  await expect(page.getByRole("heading", { name: "Welcome back, Rae" })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("rae.returning@example.com");
});

test("two clients racing for the same slot: second is told it was taken", async ({ browser }) => {
  const a = await browser.newPage();
  const b = await browser.newPage();
  for (const p of [a, b]) {
    await pickService(p, "Underarm Wax!");
    await pickTime(p);
    await fillClient(p);
    await answerWaxingForm(p);
    await agreeToWaiver(p);
  }
  await a.getByRole("button", { name: "Confirm booking" }).click();
  await expect(a.getByRole("heading", { name: /You're booked/ })).toBeVisible();
  await b.getByRole("button", { name: "Confirm booking" }).click();
  await expect(b.getByText(/just taken/)).toBeVisible();
  await expect(b.getByRole("heading", { name: "Pick a date & time" })).toBeVisible();
});

test("owner manages an appointment from the dashboard", async ({ page }) => {
  await pickService(page, "Brow Sculpt/Thread");
  await pickTime(page);
  await fillClient(page, { first: "Owner", last: "Flow" });
  await agreeToWaiver(page);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: /You're booked/ })).toBeVisible();

  await login(page);
  await openClientAppointment(page, "Owner Flow");
  await expect(page.getByText("By checking, I agree to the terms of the Consent and Liability Waiver")).toBeVisible();

  await page.getByLabel("Deposit method").selectOption("zelle");
  await page.getByRole("button", { name: "Mark paid" }).click();
  await expect(page.getByText("Deposit recorded.")).toBeVisible();
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText("Payment recorded.")).toBeVisible();
  await expect(page.getByText("paid in full")).toBeVisible();
  await page.getByRole("button", { name: "Completed" }).click();
  await expect(page.getByText("Marked as completed.")).toBeVisible();
});

test("owner closes a day and changes a price; the booking page follows", async ({ page, request }) => {
  await login(page);
  const svc = await request.get("/api/availability?serviceId=6&locationId=any&days=1");
  const firstDate = (await svc.json()).startDate as string;
  await page.getByRole("link", { name: "Hours & time off" }).click();
  await page.locator("#ov-date").fill(firstDate);
  await page.getByLabel("Closed", { exact: true }).check();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Special hours saved.")).toBeVisible();
  const after = await (await request.get(`/api/availability?serviceId=6&locationId=any&days=1&start=${firstDate}`)).json();
  expect(after.dates[0].slots).toHaveLength(0);

  await page.getByRole("link", { name: "Services" }).click();
  await page.getByRole("link", { name: /Brow Sculpt\/Thread/ }).click();
  await page.getByLabel("Price ($)").fill("20.00");
  await page.getByRole("button", { name: "Save service" }).click();
  await expect(page.getByText("Service saved.")).toBeVisible();
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search services" }).fill("Brow Sculpt/Thread");
  await expect(page.locator("#menu-panel li").filter({ hasText: "Brow Sculpt/Thread" })).toContainText("$20");
});

test("owner books a client by phone, outside regular hours @mobile", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "New appointment" }).first().click();
  await page.getByLabel("Service").selectOption({ label: "Lash Extension Removal · 30 min · $15.00" });
  const sunday = new Date();
  sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7 || 7) + 7);
  const d = sunday.toISOString().slice(0, 10);
  const fill = async () => {
    await page.getByLabel("Date & time").fill(`${d}T12:00`);
    await page.getByLabel("Email").fill("phone.client@example.com");
    await page.getByLabel("First name").fill("Phone");
    await page.getByLabel("Last name").fill("Client");
  };
  await fill();
  await page.getByRole("button", { name: "Book appointment" }).click();
  await expect(page.getByText(/isn't open/)).toBeVisible();
  await page.getByLabel(/Book even if outside hours/).check();
  await fill();
  await page.getByRole("button", { name: "Book appointment" }).click();
  await expect(page.getByText("Appointment booked.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Phone Client" })).toBeVisible();
});

test("owner logs an expense and sees it in Finance", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Finance" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Finance" })).toBeVisible();
  await page.getByRole("button", { name: "Add expense" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add expense" });
  await dialog.getByLabel("Amount ($)").fill("42.50");
  await dialog.getByLabel("What was it for?").fill("Wax beads restock");
  await dialog.getByLabel("Category").selectOption("Supplies & products");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Expense saved.")).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: "Wax beads restock" });
  await expect(row).toContainText("Supplies & products");
  await expect(row).toContainText("−$42.50");

  // Edit it, then filter the ledger.
  await row.getByRole("button", { name: /Edit/ }).click();
  const edit = page.getByRole("dialog", { name: "Edit expense" });
  await edit.getByLabel("Amount ($)").fill("40");
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Wax beads restock" })).toContainText("−$40.00");
  await page.getByRole("link", { name: "Income", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "Wax beads restock" })).toHaveCount(0);

  const csv = await page.request.get("/api/admin/finance/export?period=this-month");
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain("Wax beads restock,Card,-40.00,Manual");
});

test("client opts in to WhatsApp; owner messages and schedules a reminder", async ({ page }) => {
  await pickService(page, "Brow Sculpt/Thread");
  await pickTime(page, 6);
  await fillClient(page, { first: "Whats", last: "Appy", phone: "404-555-0177" });
  await page.getByLabel(/Send my reminder on WhatsApp/).check();
  await agreeToWaiver(page);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: /You're booked, Whats/ })).toBeVisible();

  await login(page);
  await page.goto("/admin/clients?q=Whats");
  await expect(page.getByRole("listitem").filter({ hasText: "Whats Appy" })).toContainText("WhatsApp");
  await expect(page.getByRole("link", { name: "WhatsApp Whats" })).toHaveAttribute("href", "https://wa.me/14045550177");
  await openClientAppointment(page, "Whats Appy");

  // Ready-written messages open WhatsApp with the details filled in.
  await page.getByRole("button", { name: "WhatsApp" }).click();
  const reminder = page.getByRole("menuitem", { name: /^Reminder/ });
  await expect(reminder).toHaveAttribute("href", /^https:\/\/wa\.me\/14045550177\?text=Hi%20Whats!%20/);
  await page.keyboard.press("Escape");
  await expect(reminder).toBeHidden();

  // A reminder time in the past is refused…
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: "WhatsApp reminders" }) });
  if (!(await card.getByRole("button", { name: "Schedule reminder" }).isVisible())) await card.getByText("Schedule a reminder").click();
  await card.getByLabel("Pick a time").check();
  await card.getByLabel("Send at").fill("2020-01-01T09:00");
  await card.getByRole("button", { name: "Schedule reminder" }).click();
  await expect(page.getByText(/already passed/)).toBeVisible();
  // …and one before the visit is queued.
  const when = await card.getByRole("radio").evaluateAll((els) => (els as HTMLInputElement[]).map((e) => e.value));
  if (when.includes("2")) {
    if (!(await card.getByRole("button", { name: "Schedule reminder" }).isVisible())) await card.getByText("Schedule a reminder").click();
    await card.getByLabel("2 hours before").check();
    await card.getByRole("button", { name: "Schedule reminder" }).click();
    await expect(page.getByText(/WhatsApp reminder scheduled for/)).toBeVisible();
    await expect(card.getByText("Scheduled", { exact: true })).toBeVisible();
    await card.getByRole("button", { name: "Cancel" }).last().click();
    await expect(page.getByText("Reminder canceled.")).toBeVisible();
  }
});

test("owner adds a photo and it hangs on the landing page's photo wall", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Photos" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Photos" })).toBeVisible();
  await page.locator("#gallery-file").setInputFiles({ name: "studio.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAU0lEQVR4nO3PQQ3AIADAQEAxalCHmIngcVnSU9DOu8/4s6UDXjWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaB9EHcCQioGA6gAAAAASUVORK5CYII=", "base64") });
  await expect(page.getByText("Photo 1", { exact: true })).toBeVisible();
  await page.getByLabel("Describe it").first().fill("Brow mapping in the studio");
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByText("Description saved.")).toBeVisible();

  await page.goto("/");
  const wall = page.locator('section[aria-labelledby="results-title"]');
  await expect(wall.getByRole("img", { name: "Brow mapping in the studio" })).toBeAttached();
  // The studio's own results still hang after the owner's photos.
  await expect(wall.getByRole("img")).toHaveCount(3);

  // Removing it takes it off the wall.
  await page.goto("/admin/photos");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Remove" }).first().click();
  await expect(page.getByText("Photo removed.")).toBeVisible();
  await page.goto("/");
  // With no photos of the owner's left, the wall steps aside.
  await expect(wall).toHaveCount(0);
});

test("phone: hero CTA, compact steps and sticky continue @phone", async ({ page }) => {
  await page.goto("/");
  // The hero photo fills the whole first screen; the next openings follow on scroll.
  const hero = await page.locator('section[aria-labelledby="hero-title"]').boundingBox();
  expect(hero!.height).toBeGreaterThanOrEqual(page.viewportSize()!.height - 1);
  await expect(page.getByRole("link", { name: "Book an appointment", exact: true })).toBeInViewport();
  await expect(page.getByRole("link", { name: "Book now" })).toBeInViewport();
  const firstSlot = page.getByRole("link", { name: /^Book .+ on .+ at / }).first();
  await expect(firstSlot).not.toBeInViewport();
  await firstSlot.scrollIntoViewIfNeeded();
  await expect(firstSlot).toBeInViewport();
  // Category cards swipe sideways on phones without widening the page.
  await page.getByRole("tab", { name: /Waxing/ }).click();
  await page.getByRole("button", { name: "Book Chin Wax!" }).click();
  await page.getByRole("button", { name: "Select Any available" }).click();

  // Add-ons start collapsed on phones so the calendar is close.
  const addonToggle = page.getByRole("button", { name: /Add something extra/ });
  await expect(addonToggle).toHaveAttribute("aria-expanded", "false");
  await addonToggle.click();
  await page.getByText("Jelly Mask", { exact: true }).click();
  await addonToggle.click();
  await expect(page.getByText("+ Jelly Mask").first()).toBeVisible();

  await expect(page.getByRole("group", { name: "Choose a day" }).getByRole("button")).toHaveCount(7);
  await page.locator("[data-slot]").first().click();
  await expect(page.getByRole("button", { name: /^Continue/ })).toBeInViewport();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
