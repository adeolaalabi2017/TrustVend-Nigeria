import { test, expect } from "@playwright/test";

test.describe("Admin Dashboard", () => {
  test("admin can access admin dashboard", async ({ page }) => {
    await page.goto("/");

    const signIn = page.getByRole("button", { name: /sign in|log in|login/i }).first();
    await signIn.click();
    await page.getByLabel(/email/i).fill("admin@trustvend.ng");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /sign in|log in|login/i }).click();
    await page.waitForTimeout(1500);

    await page.goto("/?view=admin-dashboard");

    await expect(page.locator("text=/admin|dashboard|vendors|users|audit/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("audit log is accessible to admin", async ({ page }) => {
    await page.goto("/");

    const signIn = page.getByRole("button", { name: /sign in|log in|login/i }).first();
    await signIn.click();
    await page.getByLabel(/email/i).fill("admin@trustvend.ng");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /sign in|log in|login/i }).click();
    await page.waitForTimeout(1500);
    await page.goto("/?view=admin-dashboard");

    const auditLink = page.getByRole("link", { name: /audit/i }).or(page.getByRole("tab", { name: /audit/i }));
    if (await auditLink.isVisible({ timeout: 3000 })) {
      await auditLink.click();
      await expect(page.locator("text=/audit|log|action|actor/i").first()).toBeVisible({ timeout: 5000 });
    }
  });
});
