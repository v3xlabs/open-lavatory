# E2E Test Directory

## Quick Start

From the project root:

```bash
# Install test dependencies
pnpm install

# Install Playwright browsers
cd tests && pnpm exec playwright install

# Run tests (starts sandbox automatically)
pnpm test

# Run tests with visual browser
pnpm test:headed

# Interactive test development
pnpm test:ui
```

## Test Files

- `sandbox-p2p.spec.ts` - Main P2P connection tests
- `utils/test-helpers.ts` - Reusable test utilities

See `../README.md` for detailed documentation. 