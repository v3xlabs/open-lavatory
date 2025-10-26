import path from 'node:path';

import { type BrowserContext,chromium, test as base } from '@playwright/test';

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  // Override default context fixture with persistent context that loads extension
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    // eslint-disable-next-line unicorn/prefer-module
    const extensionPath = path.resolve(__dirname, '../../packages/extension/.output/chrome-mv3');
    // Create unique user data directory for each test
    // const uniqueId = randomBytes(8).toString('hex');
    const userDataDir = path.join(process.cwd(), `.playwright-extension-user-data`);

    console.log(`Loading extension from: ${extensionPath}`);
    console.log(`Using user data dir: ${userDataDir}`);

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // Extensions require headed mode
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-first-run',
        '--disable-blink-features=AutomationControlled',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-timer-throttling',
      ],
      viewport: { width: 1280, height: 800 },
    });

    await use(context);
    await context.close();
  },

  // Provide extension ID to tests
  extensionId: async ({ context }, use) => {
    // Wait for the service worker (Manifest V3)
    let [serviceWorker] = context.serviceWorkers();

    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10000 });
    }

    const url = serviceWorker.url();
    const extensionId = url.split('/')[2];

    console.log(`Extension ID: ${extensionId}`);

    await use(extensionId);
  },
});

export const { expect } = test;
