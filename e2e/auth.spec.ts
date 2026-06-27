import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("customer can sign up and log in", async ({ page }) => {
    await page.goto("/");

    const signInButton = page.getByRole("button", { name: /sign in|log in|login/i }).first();
    await signInButton.click();

    const registerTab = page.getByRole("tab", { name: /sign up|register|create/i });
    if (await registerTab.isVisible()) {
      await registerTab.click();
    }

    const email = `customer${Date.now()}@test.com`;
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill("password123");
    await page.getByLabel(/name/i).fill("Test Customer");

    await page.getByRole("button", { name: /create|sign up|register/i }).click();

    await expect(page).not.toHaveURL("/"), { timeout: 5000 };
  });

  test("login with seeded customer account", async ({ page }) => {
    await page.goto("/");

    const signInButton = page.getByRole("button", { name: /sign in|log in|login/i }).first();
    await signInButton.click();

    await page.getByLabel(/email/i).fill("customer@trustvend.ng");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /sign in|log in|login/i }).click();

    await expect(page.locator("text=customer|chioma|logout", { exact: false }).first()).toBeVisible({ timeout: 10000 });
  });

  test("invalid login shows error", async ({ page }) => {
    await page.goto("/");

    const signInButton = page.getByRole("button", { name: /sign in|log in|login/i }).first();
    await signInButton.click();

    await page.getByLabel(/email/i).fill("nobody@test.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|log in|login/i }).click();

    const errorMsg = page.locator("text=/invalid|incorrect|wrong|failed/i").first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });
});
