import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/TrustVend/);
  });

  test("vendor listing loads", async ({ page }) => {
    await page.goto("/");
    const heading = page.getByRole("heading", { name: /vendor|find|discover/i }).or(page.locator("text=Browse"));
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
  });
});
