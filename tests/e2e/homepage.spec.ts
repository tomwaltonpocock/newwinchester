import { test, expect } from "@playwright/test";

test("homepage loads and shows the hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /Vision for Winchester/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start the visual review/i })).toBeVisible();
  // Disclaimer present on landing
  await expect(page.getByText(/independent public-feedback tool/i)).toBeVisible();
});

test("/chronicle redirects with source=chronicle", async ({ page }) => {
  await page.goto("/chronicle");
  await expect(page).toHaveURL(/source=chronicle/);
});

test("admin requires authentication", async ({ request }) => {
  const res = await request.get("/admin");
  expect([401, 503]).toContain(res.status());
});
