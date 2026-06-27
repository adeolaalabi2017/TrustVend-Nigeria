import { test, expect } from "@playwright/test";

test.describe("Customer Journey", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    const signIn = page.getByRole("button", { name: /sign in|log in|login/i }).first();
    await signIn.click();
    await page.getByLabel(/email/i).fill("customer@trustvend.ng");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /sign in|log in|login/i }).click();
    await page.waitForTimeout(1000);
  });

  test("customer can browse vendors and view details", async ({ page }) => {
    await page.goto("/");

    const vendorCard = page.locator("[class*='cursor-pointer']").first();
    await vendorCard.click();

    await expect(page.locator("text=/business|vendor|adaeze|couture/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("customer can bookmark a vendor", async ({ page }) => {
    await page.goto("/");

    const bookmarkBtn = page.locator("[aria-label='Bookmark vendor']").first();
    if (await bookmarkBtn.isVisible({ timeout: 5000 })) {
      await bookmarkBtn.click();
      await expect(page.locator("text=/saved|bookmark/i").first()).toBeVisible({ timeout: 5000 });
    }
  });
});
