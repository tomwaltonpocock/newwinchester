import { test, expect } from "@playwright/test";

test("thank-you page builds a mailto with subject and body", async ({ page }) => {
  await page.goto("/thank-you?t=demo&pr=2&pd=1&np=0&ttl=3");
  const link = page.getByRole("link", { name: /Open email draft/i });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  expect(href!.startsWith("mailto:")).toBe(true);
  expect(decodeURIComponent(href!)).toContain("Silver Hill / Central Winchester: resident feedback");
  expect(decodeURIComponent(href!)).toContain("preferred 2 of 3");
});
