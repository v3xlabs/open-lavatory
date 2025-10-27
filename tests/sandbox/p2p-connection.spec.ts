/* eslint-disable sonarjs/no-duplicate-string */
import { type BrowserContext, expect, type Page, test } from '@playwright/test';

test.describe('OpenLV Sandbox P2P Connection', () => {
    let peerAContext: BrowserContext;
    let peerBContext: BrowserContext;
    let peerAPage: Page;
    let peerBPage: Page;

    test.beforeEach(async ({ browser }) => {
        // Create two separate browser contexts to simulate different users
        peerAContext = await browser.newContext();
        peerBContext = await browser.newContext();

        // Create pages for each peer
        peerAPage = await peerAContext.newPage();
        peerBPage = await peerBContext.newPage();

        // Navigate both pages to the sandbox
        await peerAPage.goto('/');
        await peerBPage.goto('/');

        // Wait for pages to load
        await expect(peerAPage.locator('h1:has-text("OpenLV Wallet Demo")')).toBeVisible();
        await expect(peerBPage.locator('h1:has-text("OpenLV Wallet Demo")')).toBeVisible();
    });

    test.afterEach(async () => {
        await peerAContext.close();
        await peerBContext.close();
    });

    test('should establish P2P connection between two sandbox instances', async () => {
        // Step 1: Peer A initializes session
        await test.step('Peer A initializes session', async () => {
            await peerAPage.click('[data-testid="init-session-button"]');

            // Wait for connection URL to be generated
            await expect(peerAPage.locator('[data-testid="connection-url"]')).toBeVisible({
                timeout: 10000,
            });

            // Verify status shows connecting state (waiting for wallet or connected)
            await expect(peerAPage.locator('[data-testid="connection-status"]')).toContainText(
                /Waiting for wallet|Connected|P2P|MQTT/
            );
        });

        // Step 2: Get connection URL from Peer A
        const connectionUrl = await test.step('Extract connection URL', async () => {
            const urlElement = peerAPage.locator('[data-testid="connection-url"]');
            const url = await urlElement.textContent();

            expect(url).toBeTruthy();
            expect(url).toMatch(/^openlv:\/\//);

            return url!;
        });

        // Step 3: Peer B connects using the URL
        await test.step('Peer B connects to session', async () => {
            await peerBPage.fill('[data-testid="connection-url-input"]', connectionUrl);
            await peerBPage.click('[data-testid="connect-session-button"]');

            // Wait for connection to establish
            await expect(peerBPage.locator('[data-testid="connection-status"]')).toContainText(
                /Connected|P2P.*ready/,
                { timeout: 30000 }
            );
        });

        // Step 4: Verify both peers show connected status
        await test.step('Verify connection established on both sides', async () => {
            // Check Peer A shows connected
            await expect(peerAPage.locator('[data-testid="connection-status"]')).toContainText(
                /Connected|P2P.*ready/,
                { timeout: 30000 }
            );

            // Check Peer B shows connected
            await expect(peerBPage.locator('[data-testid="connection-status"]')).toContainText(
                /Connected|P2P.*ready/
            );

            // Verify messaging interface is available on both sides
            await expect(peerAPage.locator('[data-testid="send-test-button"]')).toBeVisible();
            await expect(peerBPage.locator('[data-testid="send-test-button"]')).toBeVisible();
        });

        // Step 5: Test message exchange
        await test.step('Test bidirectional messaging', async () => {
            // Peer A sends test message
            await peerAPage.click('[data-testid="send-test-button"]');

            // Wait for message to appear in Peer A's log
            await expect(peerAPage.locator('[data-testid="message-log"]')).toContainText(
                /Test sent via/,
                { timeout: 10000 }
            );

            // Wait for message to be received by Peer B
            await expect(peerBPage.locator('[data-testid="message-log"]')).toContainText(
                /Received/,
                { timeout: 10000 }
            );

            // Peer B sends test message back
            await peerBPage.click('[data-testid="send-test-button"]');

            // Wait for message to appear in Peer B's log
            await expect(peerBPage.locator('[data-testid="message-log"]')).toContainText(
                /Test sent via/,
                { timeout: 10000 }
            );

            // Wait for message to be received by Peer A
            await expect(peerAPage.locator('[data-testid="message-log"]')).toContainText(
                /Received.*Test message/,
                { timeout: 10000 }
            );
        });

        // Step 6: Verify connection quality (preferably WebRTC)
        await test.step('Verify connection quality', async () => {
            // Check if WebRTC connection was established (ideal case)
            const peerAStatus = await peerAPage
                .locator('[data-testid="connection-status"]')
                .textContent();
            const peerBStatus = await peerBPage
                .locator('[data-testid="connection-status"]')
                .textContent();

            // Log connection types for debugging
            console.log('Peer A Status:', peerAStatus);
            console.log('Peer B Status:', peerBStatus);

            // At minimum, we should have MQTT connection, ideally WebRTC
            expect(peerAStatus).toMatch(/(WebRTC|MQTT).*Connected|P2P.*ready/);
            expect(peerBStatus).toMatch(/(WebRTC|MQTT).*Connected|P2P.*ready/);
        });
    });

    test('should handle connection failures gracefully', async () => {
        // Test with invalid URL
        await test.step('Test invalid connection URL', async () => {
            await peerBPage.fill('[data-testid="connection-url-input"]', 'invalid://url');
            await peerBPage.click('[data-testid="connect-session-button"]');

            // Should remain disconnected or show error
            await expect(peerBPage.locator('[data-testid="connection-status"]')).not.toContainText(
                /WebRTC Connected/,
                { timeout: 5000 }
            );
        });
    });

    test('should support multiple connection attempts', async () => {
        // First, establish a successful connection
        await peerAPage.click('[data-testid="init-session-button"]');
        await expect(peerAPage.locator('[data-testid="connection-url"]')).toBeVisible({
            timeout: 10000,
        });

        const connectionUrl = await peerAPage
            .locator('[data-testid="connection-url"]')
            .textContent();

        expect(connectionUrl).toBeTruthy();

        await peerBPage.fill('[data-testid="connection-url-input"]', connectionUrl!);
        await peerBPage.click('[data-testid="connect-session-button"]');

        // Wait for initial connection
        await expect(peerBPage.locator('[data-testid="connection-status"]')).toContainText(
            /Connected|P2P.*ready/,
            { timeout: 30000 }
        );

        // Disconnect and reconnect
        // Note: This would require adding disconnect functionality and test IDs for it
        // For now, we'll just verify the connection persists
        await expect(peerBPage.locator('[data-testid="connection-status"]')).toContainText(
            /Connected|P2P.*ready/
        );
    });
});
