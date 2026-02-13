import { expect, type Page } from "@playwright/test";

/**
 * Wait for OpenLV connection to establish between two peers
 */
export const waitForConnection = async (
  peerA: Page,
  peerB: Page,
  timeout = 30_000,
) => {
  // Wait for both peers to show connected status
  await Promise.all([
    expect(
      peerA.locator("[data-testid=\"connection-status\"]"),
    ).toContainText(/Connected/, {
      timeout,
    }),
    expect(
      peerB.locator("[data-testid=\"connection-status\"]"),
    ).toContainText(/Connected/, {
      timeout,
    }),
  ]);
};

/**
 * Extract connection URL from Peer A
 */
export const getConnectionUrl = async (peerA: Page): Promise<string> => {
  const urlElement = peerA.locator("[data-testid=\"connection-url\"]");

  await expect(urlElement).toBeVisible({ timeout: 10_000 });

  const url = await urlElement.textContent();

  expect(url).toBeTruthy();
  expect(url).toMatch(/^openlv:\/\//);

  return url!;
};

/**
 * Initialize session on Peer A
 */
export const initializeSession = async (peerA: Page) => {
  await peerA.click("[data-testid=\"init-session-button\"]");
  await expect(peerA.locator("[data-testid=\"connection-url\"]")).toBeVisible({
    timeout: 10_000,
  });
};

/**
 * Connect Peer B to session using URL
 */
export const connectToSession = async (peerB: Page, connectionUrl: string) => {
  await peerB.fill("[data-testid=\"connection-url-input\"]", connectionUrl);
  await peerB.click("[data-testid=\"connect-session-button\"]");
};

/**
 * Send test message and verify it's sent
 */
export const sendTestMessage = async (page: Page) => {
  await page.click("[data-testid=\"send-test-button\"]");
  await expect(page.locator("[data-testid=\"message-log\"]")).toContainText(
    /Test sent via/,
    {
      timeout: 10_000,
    },
  );
};

/**
 * Wait for message to be received
 */
export const waitForMessageReceived = async (
  page: Page,
  messagePattern: string | RegExp = /Received/,
  timeout = 10_000,
) => {
  await expect(page.locator("[data-testid=\"message-log\"]")).toContainText(
    messagePattern,
    {
      timeout,
    },
  );
};

/**
 * Get connection type (WebRTC or MQTT)
 */
export const getConnectionType = async (
  page: Page,
): Promise<"WebRTC" | "MQTT" | "Unknown"> => {
  const statusText = await page
    .locator("[data-testid=\"connection-status\"]")
    .textContent();

  if (statusText?.includes("WebRTC")) return "WebRTC";

  if (statusText?.includes("MQTT")) return "MQTT";

  return "Unknown";
};

/**
 * Verify pages are loaded and ready
 */
export const waitForPagesReady = async (peerA: Page, peerB: Page) => {
  await Promise.all([
    expect(
      peerA.locator("h1:has-text(\"OpenLV Wallet Demo\")"),
    ).toBeVisible(),
    expect(
      peerB.locator("h1:has-text(\"OpenLV Wallet Demo\")"),
    ).toBeVisible(),
  ]);
};
