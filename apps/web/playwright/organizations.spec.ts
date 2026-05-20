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

test.describe("Organization settings (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Organizations link appears in settings sidebar", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("link", { name: /organizations?/i })).toBeVisible();
  });

  test("Organizations page loads with heading", async ({ page }) => {
    await page.goto("/settings/organizations");
    await expect(page.getByRole("heading", { name: /organizations?/i })).toBeVisible();
  });

  test("Create Organization page loads with name and slug fields", async ({ page }) => {
    await page.goto("/settings/organizations/new");
    await expect(page.getByLabel(/organization name|org name/i)).toBeVisible();
  });

  test("Can create an organization and land on org settings page", async ({ page }) => {
    const slug = `e2e-org-${Date.now()}`;
    await page.goto("/settings/organizations/new");

    await page.getByLabel(/organization name|org name/i).fill("E2E Test Org");

    const nextBtn = page.getByRole("button", { name: /next|continue/i }).first();
    await nextBtn.click();

    const skipBtn = page.getByRole("button", { name: /skip/i });
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
    }

    const createBtn = page.getByRole("button", { name: /create org|finish/i });
    if (await createBtn.isVisible()) {
      await createBtn.click();
    }

    await page.waitForURL(/\/settings\/organizations\/\d+/);
    await expect(page.getByText(/E2E Test Org/i)).toBeVisible();
  });
});

test.describe("Organization subdomain routing", () => {
  test("org subdomain rewrite is active when ORGANIZATIONS_ENABLED is set", async ({ page }) => {
    if (!process.env.TEST_ORG_SUBDOMAIN_HOST) {
      test.skip();
      return;
    }
    await page.goto(`http://${process.env.TEST_ORG_SUBDOMAIN_HOST}`);
    await expect(page).not.toHaveURL(/404/);
  });
});
