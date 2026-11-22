import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  for (const v of serious) console.log(`[${label}] ${v.id}: ${v.help}\n  ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n  ")}`);
  expect(serious, `${label}: ${serious.map((v) => v.id).join(", ")}`).toEqual([]);
}

test("client pages have no serious accessibility issues", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await audit(page, "landing");

  await page.getByRole("tab", { name: /Waxing/ }).click();
  await audit(page, "carousel");
  await page.getByRole("searchbox", { name: "Search services" }).fill("Brow Sculpt/Thread");
  await page.getByRole("button", { name: "Book Brow Sculpt/Thread", exact: true }).click();
  await page.getByRole("button", { name: "Select Any available" }).click();
  await page.locator("[data-slot]").first().click();
  await audit(page, "date & time");

  await page.getByRole("button", { name: /^Continue/ }).click();
  await audit(page, "details");

  await page.getByLabel("First name", { exact: true }).fill("Axe");
  await page.getByLabel("Last name", { exact: true }).fill("Check");
  await page.getByLabel("Mobile number").fill("4045550111");
  await page.getByLabel("Email", { exact: true }).fill("axe.check@example.com");
  await page.getByText(/By checking, I agree to the terms of the Consent and Liability Waiver/).click();
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: /You're booked/ })).toBeVisible();
  await audit(page, "confirmation");
});

test("scroll animations never leave content hidden", async ({ browser }) => {
  // With motion: everything is revealed once scrolled past.
  const page = await browser.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-reveal-ready", "");
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y <= height; y += 500) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" as ScrollBehavior }), y);
    await page.waitForTimeout(50);
  }
  await expect
    .poll(() => page.evaluate(() => [...document.querySelectorAll("[data-reveal]")].filter((e) => !e.hasAttribute("data-revealed")).length))
    .toBe(0);
  await page.close();

  // Reduced motion: nothing is ever hidden.
  const calm = await browser.newPage({ reducedMotion: "reduce" });
  await calm.goto("/");
  await expect(calm.locator("html")).not.toHaveAttribute("data-reveal-ready", "");
  const minOpacity = await calm.evaluate(() => Math.min(...[...document.querySelectorAll("[data-reveal]")].map((e) => Number(getComputedStyle(e).opacity))));
  expect(minOpacity).toBe(1);
  await calm.close();
});

test("menu details sheet and account pages are accessible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search services" }).fill("lami");
  await page.getByRole("button", { name: "Brow Lami Set ♡, details" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await audit(page, "details sheet");
  await page.keyboard.press("Escape");

  await page.goto("/account");
  await audit(page, "account sign-in");
  await page.getByLabel("Email").fill(`axe${Date.now()}@example.com`);
  await page.getByRole("button", { name: /Email me a code/ }).click();
  const hint = await page.getByText(/here's the code for testing/).textContent();
  await page.getByLabel("6-digit code").fill(hint!.match(/(\d{6})/)![1]);
  await expect(page.getByRole("heading", { name: /^Hi/ })).toBeVisible();
  await audit(page, "account dashboard");
});

test("owner dashboard pages are accessible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill("e2e-owner-pass");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening)/ })).toBeVisible();
  await audit(page, "dashboard home");
  for (const [path, heading] of [
    ["/admin/calendar", "Calendar"],
    ["/admin/finance", "Finance"],
    ["/admin/clients", "Clients"],
    ["/admin/settings", "Settings"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await audit(page, heading.toLowerCase());
  }
  await page.goto("/admin/finance");
  await page.getByRole("button", { name: "Add expense" }).first().click();
  await expect(page.getByRole("dialog", { name: "Add expense" })).toBeVisible();
  await audit(page, "expense dialog");
});
