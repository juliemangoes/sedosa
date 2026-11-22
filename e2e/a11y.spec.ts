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
