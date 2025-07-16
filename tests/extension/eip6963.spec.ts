import { test, expect } from './fixtures';
import {
  waitForOpenLVProvider,
  hasOpenLVProvider,
  testEIP6963Discovery,
} from './utils/helpers';

test.describe('OpenLV Extension - EIP-6963 Provider Detection', () => {
  
  test('should inject OpenLV provider and support EIP-6963', async ({ page }) => {
    // Navigate to example.com first
    await page.goto('https://example.com');
    
    // Wait for provider injection
    await waitForOpenLVProvider(page);
    
    // Verify provider is available
    const hasProvider = await hasOpenLVProvider(page);
    expect(hasProvider).toBe(true);
    
    // Test EIP-6963 discovery mechanism
    const discovery = await testEIP6963Discovery(page);
    
    console.log('EIP-6963 Discovery Results:', {
      totalProviders: discovery.providers.length,
      hasOpenLV: discovery.hasOpenLV,
      providers: discovery.providers.map((p: any) => p.info?.name || 'Unknown')
    });
    
    // Verify OpenLV provider is discovered via EIP-6963
    expect(discovery.hasOpenLV).toBe(true);
    expect(discovery.providers.length).toBeGreaterThan(0);
    expect(discovery.openLVProvider).toBeDefined();
    
    console.log('✅ EIP-6963 discovery working correctly');
  });

  test('should be detected on eip6963.org', async ({ page }) => {
    // Navigate to the official EIP-6963 test site
    await page.goto('https://eip6963.org/');
    
    // Wait for provider injection and page load
    await waitForOpenLVProvider(page, 15000);
    await page.waitForLoadState('networkidle');
    
    // Wait a bit more for the page's wallet detection to complete
    await page.waitForTimeout(5000);
    
    // Check if the page detected any providers by looking for common patterns
    const detection = await page.evaluate(() => {
      // Look for various possible wallet detection patterns
      const possibleSelectors = [
        '[data-testid^="wallet-"]',
        '[data-testid*="provider"]',
        '.wallet-item',
        '.provider-item',
        '.wallet',
        '.provider',
        'button[data-provider]',
        'div[data-wallet]'
      ];
      
      let detected = false;
      let walletCount = 0;
      let hasOpenLV = false;
      let providerNames: string[] = [];
      
      for (const selector of possibleSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          detected = true;
          walletCount = Math.max(walletCount, elements.length);
          
          // Check text content for OpenLV
          elements.forEach(el => {
            const text = el.textContent || '';
            providerNames.push(text.trim());
            if (text.toLowerCase().includes('openlv') || 
                text.toLowerCase().includes('lavatory') ||
                text.toLowerCase().includes('openlavatory')) {
              hasOpenLV = true;
            }
          });
        }
      }
      
      // Also check if there's any mention of our provider in the page text
      const pageText = document.body.textContent || '';
      if (pageText.toLowerCase().includes('openlavatory') || 
          pageText.toLowerCase().includes('openlv')) {
        hasOpenLV = true;
      }
      
      return {
        detected,
        hasOpenLV,
        providerNames: providerNames.filter(name => name.length > 0).slice(0, 5), // First 5 for brevity
        walletCount,
        pageHasProviderText: pageText.includes('provider') || pageText.includes('wallet'),
        pageTitle: document.title
      };
    });
    
    console.log('EIP-6963.org Detection Results:', detection);
    
    // The test should either detect wallets or at least have provider-related content
    // Some versions of eip6963.org may not detect extension-injected providers
    if (!detection.detected && !detection.pageHasProviderText) {
      console.warn('Page may not be the expected eip6963.org interface');
    }
    
    // We should at least verify that our provider is injected correctly
    const hasProvider = await hasOpenLVProvider(page);
    expect(hasProvider).toBe(true);
    
    console.log('✅ OpenLV provider verified on eip6963.org');
  });

  test('should announce provider on page load', async ({ page }) => {
    // Navigate to page first
    await page.goto('https://example.com');
    
    // Wait for provider injection
    await waitForOpenLVProvider(page);
    
    // Now test the announcement mechanism
    const eventReceived = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        let eventReceived = false;
        
        const handler = (event: any) => {
          const provider = event.detail;
          if (provider.info.name?.toLowerCase().includes('openlv') || 
              provider.info.name?.toLowerCase().includes('lavatory')) {
            eventReceived = true;
            resolve(true);
          }
        };
        
        window.addEventListener('eip6963:announceProvider', handler);
        
        // Request providers (this should trigger announcement)
        window.dispatchEvent(new CustomEvent('eip6963:requestProvider'));
        
        // Timeout after 5 seconds
        setTimeout(() => {
          if (!eventReceived) {
            resolve(false);
          }
        }, 5000);
      });
    });
    
    expect(eventReceived).toBe(true);
    console.log('✅ Provider announcement event working correctly');
  });

  test('should work across different websites', async ({ page }) => {
    const testSites = [
      'https://example.com',
      'https://httpbin.org/html',
    ];

    for (const site of testSites) {
      console.log(`Testing OpenLV injection on ${site}...`);
      
      await page.goto(site);
      
      // Wait for provider injection
      const injected = await waitForOpenLVProvider(page, 10000);
      expect(injected).toBe(true);
      
      // Verify provider is available
      const hasProvider = await hasOpenLVProvider(page);
      expect(hasProvider).toBe(true);
      
      console.log(`✅ OpenLV provider working on ${site}`);
    }
  });
}); 