const { defineConfig } = require('@playwright/test');

/**
 * Simplified Playwright configuration for OpenLV Extension E2E tests
 * Tests the browser extension in Chromium with extension loaded
 */
module.exports = defineConfig({
  testDir: './extension',
  
  /* Disable parallel execution to avoid browser conflicts */
  fullyParallel: false,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Single worker to avoid conflicts */
  workers: 1,
  
  /* Reporter to use. */
  reporter: 'html',
  
  /* Global timeout for each test */
  timeout: 60 * 1000, // 60 seconds per test
  
  /* Shared settings for all projects */
  use: {
    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video recording */
    video: 'retain-on-failure',
  },

  /* Configure Chromium project with extension loaded */
  projects: [
    {
      name: 'chromium-extension',
      use: {
        browserName: 'chromium',
        // The extension loading is handled by our custom fixtures
        // which use launchPersistentContext with proper extension args
      },
    },
  ],

  /* Global setup to ensure extensions are built before tests */
  globalSetup: require.resolve('./extension-setup.js'),
}); 