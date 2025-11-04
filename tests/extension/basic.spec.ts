import { expect, test } from "./fixtures";
import { hasOpenLVProvider, waitForOpenLVProvider } from "./utils/helpers";

test.describe("OpenLV Extension - Basic Functionality", () => {
  test("should work across different websites", async ({ page }) => {
    const websites = ["https://example.com"];

    for (const website of websites) {
      console.log(`Testing OpenLV injection on ${website}...`);

      await page.goto(website);

      // Wait for provider injection
      const providerInjected = await waitForOpenLVProvider(page);

      expect(providerInjected).toBe(true);

      // Verify provider is available
      const hasProvider = await hasOpenLVProvider(page);

      expect(hasProvider).toBe(true);

      console.log(`✅ OpenLV provider working on ${website}`);
    }
  });
});
