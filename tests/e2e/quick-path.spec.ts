import { test, expect } from "@playwright/test";

/**
 * "Quick path" — smoke test the multi-step flow renders without server writes.
 * Skipped automatically when no Supabase backend is configured.
 */
test.skip(!process.env.SUPABASE_URL, "Requires Supabase for live submissions");

test("user can step through the review flow", async ({ page }) => {
  await page.goto("/review");
  await expect(page.getByRole("heading", { name: /How this works/i })).toBeVisible();
  await page.getByRole("button", { name: /Continue/i }).click();

  // Click "no clear preference" on each pair to advance.
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: /No clear preference/i }).click();
    await page.getByRole("button", { name: /Continue/i }).click();
  }

  // Missing info step
  await expect(page.getByRole("heading", { name: /What still needs to be shown/i })).toBeVisible();
  await page.getByRole("button", { name: /Continue/i }).click();

  // Overall step
  await expect(page.getByRole("heading", { name: /Overall view/i })).toBeVisible();
  await page.getByRole("button", { name: /Continue/i }).click();

  // Upload step (skip)
  await page.getByRole("button", { name: /Continue/i }).click();

  // Validation page renders
  await expect(page.getByRole("heading", { name: /Almost done/i })).toBeVisible();
});
