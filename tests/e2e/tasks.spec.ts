import { test, expect, type Page } from "@playwright/test";

/**
 * Task CRUD end-to-end tests.
 *
 * Required environment variables:
 *   E2E_TENANT          Tenant slug  (default: "demo")
 *   E2E_ADMIN_EMAIL     Admin user email (must have tasks:create/update/delete)
 *   E2E_ADMIN_PASSWORD  Admin user password
 *
 * Tests are automatically skipped if credentials are not provided.
 */

const TENANT = process.env.E2E_TENANT ?? "demo";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";

const loginURL = `/login?__tenant=${TENANT}`;
const tasksURL = `/tasks?__tenant=${TENANT}`;

async function loginAs(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto(loginURL);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('[type="submit"]');
  await page.waitForURL(/dashboard|tasks|\//, { timeout: 10_000 });
}

// All tests in this suite need valid credentials
test.beforeEach(async ({}, testInfo) => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    testInfo.skip(
      true,
      "Skipped: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set"
    );
  }
});

test.describe("Task list", () => {
  test("shows the tasks page after login", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(tasksURL);

    // Heading or page marker for tasks
    await expect(
      page.locator("h1, h2").filter({ hasText: /tasks/i }).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Task creation", () => {
  const TEST_TASK_TITLE = `E2E Test Task ${Date.now()}`;

  test("creates a task via the UI and it appears in the list", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(tasksURL);

    // Open "Create task" dialog
    const createBtn = page
      .locator("button")
      .filter({ hasText: /new task|create task|add task/i })
      .first();
    await expect(createBtn).toBeVisible({ timeout: 8_000 });
    await createBtn.click();

    // Fill in the task title
    const titleInput = page
      .locator('input[placeholder*="title" i], input[name="title"], #title')
      .first();
    await expect(titleInput).toBeVisible({ timeout: 5_000 });
    await titleInput.fill(TEST_TASK_TITLE);

    // Select a priority if required
    const prioritySelect = page
      .locator('select[name="priority"], [data-testid="priority-select"]')
      .first();
    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption("medium");
    }

    // Submit the form
    const submitBtn = page
      .locator('button[type="submit"], button')
      .filter({ hasText: /create|save|submit/i })
      .last();
    await submitBtn.click();

    // The task should appear somewhere on the page
    await expect(page.locator(`text=${TEST_TASK_TITLE}`)).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Task status flow", () => {
  test("tasks page renders without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(tasksURL);

    // Wait for the page to settle
    await page.waitForLoadState("networkidle");

    expect(
      errors.filter((e) => !e.includes("ResizeObserver")),
      "Unexpected JS errors on tasks page"
    ).toHaveLength(0);
  });
});

test.describe("Permission enforcement", () => {
  test("staff user cannot access admin settings page", async ({ page }) => {
    const staffEmail = process.env.E2E_STAFF_EMAIL;
    const staffPassword = process.env.E2E_STAFF_PASSWORD;

    test.skip(
      !staffEmail || !staffPassword,
      "Skipped: E2E_STAFF_EMAIL / E2E_STAFF_PASSWORD not set"
    );

    await loginAs(page, staffEmail!, staffPassword!);
    await page.goto(`/settings?__tenant=${TENANT}`);

    // Should either redirect away or show an access-denied message
    const accessDenied = page.locator(
      "text=/forbidden|access denied|not authorized|permission/i"
    );
    const wasRedirected = !(await page.url().includes("/settings"));

    expect(
      (await accessDenied.isVisible()) || wasRedirected,
      "Staff user should not have access to settings"
    ).toBe(true);
  });
});
