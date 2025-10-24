const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Global setup for extension E2E tests
 * Ensures extension is built before running tests
 */
async function globalSetup() {
  console.log('🔧 Setting up extension E2E tests...');

  const extensionDir = path.resolve(__dirname, '../packages/extension');
  const chromeExtDir = path.resolve(extensionDir, '.output/chrome-mv3');

  // Check if extension is already built
  const chromeBuilt = fs.existsSync(path.join(chromeExtDir, 'manifest.json'));

  if (!chromeBuilt) {
    console.log('📦 Building Chrome extension for testing...');

    try {
      execSync('pnpm build:extension', {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit'
      });

      console.log('✅ Extension built successfully');
    } catch (error) {
      console.error('❌ Failed to build extension:', error.message);
      throw error;
    }
  } else {
    console.log('✅ Extension already built, skipping build step');
  }

  // Verify extension files exist
  const chromeManifest = path.join(chromeExtDir, 'manifest.json');

  if (!fs.existsSync(chromeManifest)) {
    throw new Error(`Chrome extension manifest not found at: ${chromeManifest}`);
  }

  console.log('🚀 Extension E2E test setup complete');
}

module.exports = globalSetup;
