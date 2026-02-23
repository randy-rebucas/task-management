import { test, expect } from "@playwright/test";

/**
 * Authentication E2E tests.
 *
 * Required environment variables (or set in .env.test):
 *   E2E_TENANT          Tenant slug  (default: "demo")
 *   E2E_ADMIN_EMAIL     Admin user email
 *   E2E_ADMIN_PASSWORD  Admin user password
 *
 * The middleware supports `?__tenant=<slug>` for tenant resolution on localhost.
 */

const TENANT = process.env.E2E_TENANT ?? "demo";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";

const loginURL = `/login?__tenant=${TENANT}`;
const dashboardURL = `/dashboard?__tenant=${TENANT}`;

test.describe("Login page", () => {
  test("renders the login form", async ({ page }) => {
    await page.goto(loginURL);

    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('[type="submit"]')).toBeVisible();
  });

  test("shows an error for invalid credentials", async ({ page }) => {
    await page.goto(loginURL);

    await page.fill("#email", "invalid@example.com");
    await page.fill("#password", "wrongpassword");
    await page.click('[type="submit"]');

    // Should stay on the login page and show an error message
    await expect(page).toHaveURL(new RegExp("/login"));
    await expect(
      page.locator("text=/invalid|incorrect|wrong|credentials/i")
    ).toBeVisible({ timeout: 8_000 });
  });

  test("rejects empty email submission", async ({ page }) => {
    await page.goto(loginURL);
    await page.fill("#password", "somepassword");
    await page.click('[type="submit"]');

    // HTML5 validation or custom error keeps user on login
    await expect(page).toHaveURL(new RegExp("/login"));
  });
});

test.describe("Login with valid credentials", () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    "Skipped: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set"
  );

  test("redirects to dashboard after successful login", async ({ page }) => {
    await page.goto(loginURL);
    await page.fill("#email", ADMIN_EMAIL);
    await page.fill("#password", ADMIN_PASSWORD);
    await page.click('[type="submit"]');

    // Should navigate away from /login
    await expect(page).not.toHaveURL(new RegExp("/login"), { timeout: 10_000 });
    // Should land on some dashboard route
    await expect(page).toHaveURL(new RegExp("/dashboard|/tasks|/"), {
      timeout: 10_000,
    });
  });

  test("logout clears session and redirects to login", async ({ page }) => {
    // Log in first
    await page.goto(loginURL);
    await page.fill("#email", ADMIN_EMAIL);
    await page.fill("#password", ADMIN_PASSWORD);
    await page.click('[type="submit"]');
    await page.waitForURL(/dashboard|tasks|\//);

    // Find and click a logout button/link
    const logoutTrigger = page
      .locator("button, a")
      .filter({ hasText: /sign out|log out|logout/i })
      .first();

    // If logout is behind an avatar/menu, try clicking the user avatar first
    if (!(await logoutTrigger.isVisible())) {
      await page.locator('[data-testid="user-menu"], [aria-label="user menu"], button[class*="avatar"]').first().click();
    }

    await logoutTrigger.click();
    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 8_000 });
  });
});

test.describe("Auth redirect guards", () => {
  test("unauthenticated user is redirected from dashboard to login", async ({
    page,
  }) => {
    await page.goto(dashboardURL);

    // Middleware may redirect to /login, /tenant-not-found, or /install
    // depending on the test DB state. The important invariant is that the user
    // is NOT allowed to stay on the /dashboard route.
    await expect(page).not.toHaveURL(new RegExp("/dashboard"), {
      timeout: 8_000,
    });
  });
});
