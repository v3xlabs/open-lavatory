/* eslint-disable sonarjs/no-duplicate-string */
import { expect, type Page } from '@playwright/test';

/**
 * Wait for OpenLV connection to establish between two peers
 */
export async function waitForConnection(peerA: Page, peerB: Page, timeout = 30000) {
    // Wait for both peers to show connected status
    await Promise.all([
        expect(peerA.locator('[data-testid="connection-status"]')).toContainText(/Connected/, {
            timeout,
        }),
        expect(peerB.locator('[data-testid="connection-status"]')).toContainText(/Connected/, {
            timeout,
        }),
    ]);
}

/**
 * Extract connection URL from Peer A
 */
export async function getConnectionUrl(peerA: Page): Promise<string> {
    const urlElement = peerA.locator('[data-testid="connection-url"]');

    await expect(urlElement).toBeVisible({ timeout: 10000 });

    const url = await urlElement.textContent();

    expect(url).toBeTruthy();
    expect(url).toMatch(/^openlv:\/\//);

    return url!;
}

/**
 * Initialize session on Peer A
 */
export async function initializeSession(peerA: Page) {
    await peerA.click('[data-testid="init-session-button"]');
    await expect(peerA.locator('[data-testid="connection-url"]')).toBeVisible({
        timeout: 10000,
    });
}

/**
 * Connect Peer B to session using URL
 */
export async function connectToSession(peerB: Page, connectionUrl: string) {
    await peerB.fill('[data-testid="connection-url-input"]', connectionUrl);
    await peerB.click('[data-testid="connect-session-button"]');
}

/**
 * Send test message and verify it's sent
 */
export async function sendTestMessage(page: Page) {
    await page.click('[data-testid="send-test-button"]');
    await expect(page.locator('[data-testid="message-log"]')).toContainText(/Test sent via/, {
        timeout: 10000,
    });
}

/**
 * Wait for message to be received
 */
export async function waitForMessageReceived(
    page: Page,
    messagePattern: string | RegExp = /Received/,
    timeout = 10000
) {
    await expect(page.locator('[data-testid="message-log"]')).toContainText(messagePattern, {
        timeout,
    });
}

/**
 * Get connection type (WebRTC or MQTT)
 */
export async function getConnectionType(page: Page): Promise<'WebRTC' | 'MQTT' | 'Unknown'> {
    const statusText = await page.locator('[data-testid="connection-status"]').textContent();

    if (statusText?.includes('WebRTC')) return 'WebRTC';

    if (statusText?.includes('MQTT')) return 'MQTT';

    return 'Unknown';
}

/**
 * Verify pages are loaded and ready
 */
export async function waitForPagesReady(peerA: Page, peerB: Page) {
    await Promise.all([
        expect(peerA.locator('h1:has-text("OpenLV Wallet Demo")')).toBeVisible(),
        expect(peerB.locator('h1:has-text("OpenLV Wallet Demo")')).toBeVisible(),
    ]);
}
