import { expect, test } from "@playwright/test";

test("OpenLV wallet appears in the wallet list", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /connect wallet/i }).click();

  await expect(page.getByText("Other Wallets")).toBeVisible();
});

test("clicking OpenLV wallet opens the OpenLV modal", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /connect wallet/i }).click();

  await page.getByText("Other Wallets").click();

  await expect(page.locator("openlv-modal")).toBeAttached();
  await expect(page.locator("openlv-modal >> text=Generate QR")).toBeVisible();
});
