// Import the shared workspace configuration
import config from '../../eslint.config.js';

export default [
  // Add extension-specific ignores before the shared config
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '**/*.gen.ts',
      '.wxt/**',
      '.output/**',
      'build/**',
      'coverage/**',
      'chunks/**',
      'content-scripts/**',
      '*.js', // Ignore built JS files in root
    ],
  },
  
  // Include the shared configuration
  ...config,
];