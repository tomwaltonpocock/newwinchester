import { test, expect } from "@playwright/test";

test("contact page renders the form", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("heading", { name: /Contact/i })).toBeVisible();
  await expect(page.getByLabel(/Message/i)).toBeVisible();
});

test("privacy and cookies pages are reachable", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: /^Privacy$/i })).toBeVisible();
  await page.goto("/cookies");
  await expect(page.getByRole("heading", { name: /Cookies/i })).toBeVisible();
});
