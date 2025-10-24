# Sandbox Test Directory

## Quick Start

From the project root:

```bash
# Install test dependencies
pnpm install

# Install Playwright browsers
cd tests && pnpm exec playwright install

# Run sandbox tests (starts sandbox automatically)
pnpm test:sandbox

# Run tests with visual browser
pnpm test:sandbox:headed

# Interactive test development
pnpm test:sandbox:ui
```

## Test Files

- `p2p-connection.spec.ts` - Main P2P connection tests
- `utils/helpers.ts` - Reusable test utilities

See `../README.md` for detailed documentation.
