import { Page } from "@playwright/test";

export async function loginAs(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/");
  const signIn = page
    .getByRole("button", { name: /sign in|log in|login/i })
    .first();
  await signIn.click();
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForTimeout(1000);
}

export async function waitForOverlay(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
}

export function getTestEmail(prefix = "test"): string {
  return `${prefix}${Date.now()}@test.com`;
}
