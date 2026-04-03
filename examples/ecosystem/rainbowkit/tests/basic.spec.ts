import { expect, test } from "@playwright/test";

test("rainbowkit vite app loads with connect button", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /connect wallet/i })).toBeVisible();
});
