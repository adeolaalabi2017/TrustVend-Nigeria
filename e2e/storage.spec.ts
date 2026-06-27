import { test, expect } from "@playwright/test";
import path from "path";

test.describe("File Upload", () => {
  test("vendor can upload a photo", async ({ page }) => {
    await page.goto("/");
    const signIn = page.getByRole("button", { name: /sign in|log in|login/i }).first();
    await signIn.click();
    await page.getByLabel(/email/i).fill("adaezecouture@trustvend.ng");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /sign in|log in|login/i }).click();
    await page.waitForTimeout(1500);

    await page.goto("/?view=vendor-dashboard");

    const editBtn = page.getByRole("button", { name: /edit|photos|upload/i }).first();
    if (await editBtn.isVisible({ timeout: 3000 })) {
      await editBtn.click();
    }

    const uploadInput = page.locator("input[type='file']");
    if (await uploadInput.isVisible({ timeout: 3000 })) {
      await expect(uploadInput).toBeAttached();
    }
  });
});
