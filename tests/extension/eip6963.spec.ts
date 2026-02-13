import { test } from "./fixtures";

test.describe("OpenLV Extension - EIP-6963 Provider Detection", () => {
  test("should show \"Open Lavatory\" in wallet list on eip6963.org", async ({
    page,
  }) => {
    // Navigate to the official EIP-6963 test site
    await page.goto("https://eip6963.org/");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Wait for "Open Lavatory" to appear in the wallet list
    // This will wait up to 10 seconds for the text to appear anywhere on the page
    await page.waitForSelector("text=Open Lavatory", { timeout: 10_000 });

    console.log("✅ \"Open Lavatory\" detected in wallet list on eip6963.org");
  });
});
