import type { Page } from "@playwright/test";

// Type for EIP-6963 discovery results
export interface EIP6963DiscoveryResult {
  providers: unknown[];
  hasOpenLV: boolean;
  openLVProvider: unknown;
}

type WindowWithOpenLV = Window & { openlv?: unknown; };

/**
 * Wait for OpenLV provider to be injected into the page
 */
export const waitForOpenLVProvider = async (
  page: Page,
  timeout = 10_000,
): Promise<boolean> => {
  try {
    await page.waitForFunction(
      () => (globalThis as WindowWithOpenLV).openlv !== undefined,
      {
        timeout,
      },
    );

    return true;
  }
  catch {
    console.log("OpenLV provider not found within timeout");

    return false;
  }
};

/**
 * Check if OpenLV provider is available on the page
 */
export const hasOpenLVProvider = async (page: Page): Promise<boolean> =>
  await page.evaluate(
    () => (globalThis as WindowWithOpenLV).openlv !== undefined,
  );

/**
 * Get OpenLV provider methods
 */
export const getOpenLVMethods = async (page: Page): Promise<string[]> =>
  await page.evaluate(() => {
    const { openlv } = globalThis as WindowWithOpenLV;

    if (!openlv) return [];

    const methods: string[] = [];

    // Get methods from the object and its prototype chain
    let obj = openlv;

    while (obj && obj !== Object.prototype) {
      const props = Object.getOwnPropertyNames(obj);

      for (const prop of props) {
        if (
          prop !== "constructor"
          && typeof (openlv as Record<string, unknown>)[prop]
          === "function"
          && !methods.includes(prop)
        ) {
          methods.push(prop);
        }
      }
      obj = Object.getPrototypeOf(obj);
    }

    return methods.sort();
  });

/**
 * Test EIP-6963 provider discovery
 */
export const testEIP6963Discovery = async (
  page: Page,
): Promise<EIP6963DiscoveryResult> =>
  await page.evaluate(
    () =>
      new Promise<EIP6963DiscoveryResult>((resolve) => {
        const providers: unknown[] = [];
        let hasOpenLV = false;
        let openLVProvider: unknown | undefined;

        // Listen for provider announcements
        globalThis.addEventListener(
          "eip6963:announceProvider",
          (event: Event) => {
            const { detail } = event as CustomEvent<
              { info: { name: string; }; }
            >;

            providers.push(detail);

            if (
              detail.info?.name
                ?.toLowerCase()
                .includes("openlv")
                || detail.info?.name?.toLowerCase().includes("lavatory")
            ) {
              hasOpenLV = true;
              openLVProvider = detail;
            }
          },
        );

        // Request providers
        globalThis.dispatchEvent(
          new CustomEvent("eip6963:requestProvider"),
        );

        // Wait for providers to announce
        setTimeout(() => {
          resolve({
            providers,
            hasOpenLV,
            openLVProvider,
          });
        }, 2000);
      }),
  );
