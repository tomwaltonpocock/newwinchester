import { test, expect } from "@playwright/test";

/**
 * Smoke-test the multi-step review flow renders. Skipped automatically when
 * Supabase isn't configured (no live submission).
 */
test.skip(!process.env.SUPABASE_URL, "Requires Supabase for live submissions");

test("user can step through the review flow", async ({ page }) => {
  await page.goto("/review");
  await expect(page.getByRole("heading", { name: /How this works/i })).toBeVisible();
  await page.getByRole("button", { name: /Continue/i }).click();

  // Aspect 1 should be visible.
  await expect(page.getByText(/Aspect 1 of/i)).toBeVisible();

  // Star ratings are radio groups; tap "5 stars" on Current to enable Continue.
  await page.getByRole("radio", { name: /5 stars/i }).first().click();
  await page.getByRole("button", { name: /Continue/i }).click();
});
