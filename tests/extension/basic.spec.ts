import { test, expect } from './fixtures';
import { waitForOpenLVProvider, hasOpenLVProvider, getOpenLVMethods } from './utils/helpers';

test.describe('OpenLV Extension - Basic Functionality', () => {
  
  test('should load extension and inject OpenLV provider', async ({ page, extensionId }) => {
    console.log(`Testing with extension ID: ${extensionId}`);
    
    // Navigate to a simple test page
    await page.goto('https://example.com');
    
    // Wait for provider injection
    const providerInjected = await waitForOpenLVProvider(page);
    expect(providerInjected).toBe(true);
    
    // Verify provider is available
    const hasProvider = await hasOpenLVProvider(page);
    expect(hasProvider).toBe(true);
    
    console.log('✅ OpenLV provider successfully injected');
  });
  
  test('should provide expected API methods', async ({ page }) => {
    await page.goto('https://example.com');
    await waitForOpenLVProvider(page);
    
    const methods = await getOpenLVMethods(page);
    console.log('Available OpenLV methods:', methods);
    
    // Check for core methods from the OpenLVProvider class
    expect(methods).toContain('initConnection');
    expect(methods).toContain('connectToSession');
    expect(methods).toContain('sendMessage');
    expect(methods).toContain('disconnect');
    expect(methods).toContain('getConnectionStatus');
    expect(methods).toContain('onPhaseChange');
    expect(methods).toContain('onMessage');
    expect(methods).toContain('onError');
    
    console.log('✅ Required API methods are available');
  });
  
  test('should provide ethereum.openlv interface', async ({ page }) => {
    await page.goto('https://example.com');
    await waitForOpenLVProvider(page);
    
    const hasEthereumOpenLV = await page.evaluate(() => {
      return typeof (window as any).ethereum?.openlv !== 'undefined';
    });
    
    expect(hasEthereumOpenLV).toBe(true);
    
    // Verify they reference the same object
    const areIdentical = await page.evaluate(() => {
      return (window as any).ethereum.openlv === (window as any).openlv;
    });
    
    expect(areIdentical).toBe(true);
    console.log('✅ ethereum.openlv interface working correctly');
  });
}); 