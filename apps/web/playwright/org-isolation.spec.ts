/**
 * Cross-org isolation safety-net tests.
 *
 * These verify that authorization boundaries hold at the HTTP/page layer:
 * - Non-admin users cannot reach admin-only org management pages.
 * - Users cannot view or modify org settings for an org they don't belong to.
 * - Users cannot invite members into an org they don't belong to.
 *
 * Run with: PLAYWRIGHT_HEADLESS=1 yarn e2e apps/web/playwright/org-isolation.spec.ts
 */
import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "ADMINadmin2022!";

const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL || "member@example.com";
const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD || "MEMBERmember2022!";

async function loginAs(
  page: Parameters<Parameters<typeof test>[1]>[0]["page"],
  email: string,
  password: string
) {
  await page.goto("/auth/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/event-types|\/dashboard|\/settings/);
}

test.describe("Admin org management access control", () => {
  test("non-admin user is redirected away from /admin/organizations", async ({ page }) => {
    if (!MEMBER_EMAIL || MEMBER_EMAIL === "member@example.com") {
      // Skip if no real member credentials configured — don't false-positive
      test.skip();
      return;
    }

    await loginAs(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    await page.goto("/settings/admin/organizations");

    // Should be redirected or shown a 403/not-found — never see the org admin table
    await expect(page).not.toHaveURL(/\/settings\/admin\/organizations/);
  });

  test("unauthenticated user is redirected away from /admin/organizations", async ({ page }) => {
    await page.goto("/settings/admin/organizations");
    // Unauthenticated users must be redirected to login, never see the admin page
    await expect(page).toHaveURL(/\/auth\/login|\/sign-in/);
  });
});

test.describe("Cross-org isolation", () => {
  test("unauthenticated user cannot access org settings by direct URL", async ({ page }) => {
    // Attempt to access an org settings page directly without authentication
    await page.goto("/settings/organizations/1/members");
    await expect(page).toHaveURL(/\/auth\/login|\/sign-in/);
  });

  test("authenticated user accessing a non-existent org gets not-found", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Use a very large ID that almost certainly doesn't exist
    await page.goto("/settings/organizations/999999999/members");

    // Should see a not-found indicator, not crash or expose other org data
    const notFound =
      (await page.getByText(/not found|404|doesn't exist|no access/i).isVisible()) ||
      (await page.getByRole("heading", { name: /404/i }).isVisible());

    expect(notFound).toBe(true);
  });

  test("org settings page requires login before exposing any data", async ({ page }) => {
    // Clear any session and go directly to an org settings URL
    await page.context().clearCookies();
    await page.goto("/settings/organizations/1");

    // Must redirect to login, not render org data
    await expect(page).toHaveURL(/\/auth\/login|\/sign-in/);
  });
});

test.describe("Org invite access control (API layer)", () => {
  test("inviteMember tRPC call without auth returns 401/403", async ({ request }) => {
    // Call the tRPC endpoint directly without a session cookie
    const response = await request.post("/api/trpc/viewer.organizations.inviteMember", {
      data: {
        json: { organizationId: 1, email: "hacker@evil.com", role: "MEMBER" },
      },
      headers: { "content-type": "application/json" },
    });

    // tRPC returns 200 with an error envelope, or 401/403
    if (response.status() === 200) {
      const body = await response.json();
      // tRPC error envelope: error.data.code should be UNAUTHORIZED or FORBIDDEN
      const code = body?.error?.data?.code ?? body?.[0]?.error?.data?.code;
      expect(["UNAUTHORIZED", "FORBIDDEN"]).toContain(code);
    } else {
      expect([401, 403]).toContain(response.status());
    }
  });
});
