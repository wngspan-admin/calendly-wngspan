import { expect, test } from "@playwright/test";

if (!process.env.VITEST) {
  test("homepage loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/error/);
  });

  test("login page renders", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test("settings page requires auth", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/auth\/login/);
  });
}
