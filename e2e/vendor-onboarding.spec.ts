import { test, expect } from "@playwright/test";

test.describe("Vendor Onboarding", () => {
  test("vendor can access dashboard", async ({ page }) => {
    await page.goto("/");

    const signIn = page.getByRole("button", { name: /sign in|log in|login/i }).first();
    await signIn.click();
    await page.getByLabel(/email/i).fill("adaezecouture@trustvend.ng");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /sign in|log in|login/i }).click();
    await page.waitForTimeout(1500);

    await page.goto("/?view=vendor-dashboard");

    await expect(page.locator("text=/dashboard|analytics|reviews|views|enquiries/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("become vendor page loads", async ({ page }) => {
    await page.goto("/");

    const becomeVendorLink = page.getByRole("link", { name: /become.*vendor|vendor.*apply|list.*business/i }).first();
    await becomeVendorLink.click();
    await page.waitForURL(/\/become-vendor|apply/i, { timeout: 5000 }).catch(() => {});

    await expect(page.locator("text=/business|instagram|whatsapp|photo/i").first()).toBeVisible({ timeout: 5000 });
  });
});
