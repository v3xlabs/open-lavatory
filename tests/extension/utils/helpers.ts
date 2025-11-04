import type { Page } from "@playwright/test";

// Type for EIP-6963 discovery results
export interface EIP6963DiscoveryResult {
  providers: any[];
  hasOpenLV: boolean;
  openLVProvider: any;
}

/**
 * Wait for OpenLV provider to be injected into the page
 */
export async function waitForOpenLVProvider(
  page: Page,
  timeout = 10000,
): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => typeof (window as any).openlv !== "undefined",
      {
        timeout,
      },
    );

    return true;
  } catch {
    console.log("OpenLV provider not found within timeout");

    return false;
  }
}

/**
 * Check if OpenLV provider is available on the page
 */
export async function hasOpenLVProvider(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return typeof (window as any).openlv !== "undefined";
  });
}

/**
 * Get OpenLV provider methods
 */
export async function getOpenLVMethods(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const { openlv } = window as any;

    if (!openlv) return [];

    const methods: string[] = [];

    // Get methods from the object and its prototype chain
    let obj = openlv;

    while (obj && obj !== Object.prototype) {
      const props = Object.getOwnPropertyNames(obj);

      for (const prop of props) {
        if (prop !== "constructor" && typeof openlv[prop] === "function") {
          if (!methods.includes(prop)) {
            methods.push(prop);
          }
        }
      }
      obj = Object.getPrototypeOf(obj);
    }

    return methods.sort();
  });
}

/**
 * Test EIP-6963 provider discovery
 */
export async function testEIP6963Discovery(
  page: Page,
): Promise<EIP6963DiscoveryResult> {
  return await page.evaluate(() => {
    return new Promise<EIP6963DiscoveryResult>((resolve) => {
      const providers: any[] = [];
      let hasOpenLV = false;
      let openLVProvider: any = null;

      // Listen for provider announcements
      window.addEventListener("eip6963:announceProvider", (event: any) => {
        const { detail } = event;

        providers.push(detail);

        if (
          detail.info.name?.toLowerCase().includes("openlv") ||
          detail.info.name?.toLowerCase().includes("lavatory")
        ) {
          hasOpenLV = true;
          openLVProvider = detail;
        }
      });

      // Request providers
      window.dispatchEvent(new CustomEvent("eip6963:requestProvider"));

      // Wait for providers to announce
      setTimeout(() => {
        resolve({
          providers,
          hasOpenLV,
          openLVProvider,
        });
      }, 2000);
    });
  });
}
