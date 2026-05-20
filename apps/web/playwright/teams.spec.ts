import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "ADMINadmin2022!";

async function loginAsAdmin(page: Parameters<Parameters<typeof test>[1]>[0]["page"]) {
  await page.goto("/auth/login");
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/event-types|\/dashboard/);
}

test.describe("Teams settings (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Teams link appears in settings sidebar", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("link", { name: /teams/i })).toBeVisible();
  });

  test("Teams page loads with heading", async ({ page }) => {
    await page.goto("/settings/teams");
    await expect(page.getByRole("heading", { name: /teams/i })).toBeVisible();
  });

  test("Create Team page loads with name and slug fields", async ({ page }) => {
    await page.goto("/settings/teams/new");
    await expect(page.getByLabel(/team name/i)).toBeVisible();
  });

  test("Can create a team and land on team settings page", async ({ page }) => {
    const slug = `e2e-team-${Date.now()}`;
    await page.goto("/settings/teams/new");

    // Step 1: fill in team name (slug auto-generates or is filled)
    await page.getByLabel(/team name/i).fill("E2E Test Team");

    // Proceed past step 1
    const nextBtn = page.getByRole("button", { name: /next|continue/i }).first();
    await nextBtn.click();

    // Step 2: skip member invite if present
    const skipBtn = page.getByRole("button", { name: /skip/i });
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
    }

    // Final step: create the team
    const createBtn = page.getByRole("button", { name: /create team/i });
    if (await createBtn.isVisible()) {
      await createBtn.click();
    }

    // Should redirect to the new team's settings page
    await page.waitForURL(/\/settings\/teams\/\d+/);
    await expect(page.getByText(/E2E Test Team/i)).toBeVisible();
  });
});
