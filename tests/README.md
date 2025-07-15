# Open Lavatory Protocol - E2E Testing

This directory contains end-to-end tests for the Open Lavatory Protocol using Playwright.

## Overview

The test suite validates the core P2P connection functionality by orchestrating two browser contexts to simulate real-world usage:

1. **Peer A** (Session Creator) - Initializes OpenLV session and generates connection URL
2. **Peer B** (Session Joiner) - Connects to session using the URL
3. **Connection Verification** - Tests bidirectional messaging and connection quality

## Test Structure

```
tests/
├── e2e/
│   ├── sandbox-p2p.spec.ts      # Main P2P connection tests
│   └── utils/
│       └── test-helpers.ts       # Reusable test utilities
├── playwright.config.ts          # Playwright configuration
├── package.json                  # Test dependencies
└── README.md                     # This file
```

## Running Tests

### Prerequisites

Install test dependencies:
```bash
cd tests/
pnpm install
```

Install Playwright browsers:
```bash
pnpm exec playwright install
```

### Running Tests

**Run all tests:**
```bash
pnpm test
```

**Run with UI (interactive mode):**
```bash
pnpm test:ui
```

**Run in headed mode (see browser):**
```bash
pnpm test:headed
```

**Debug specific test:**
```bash
pnpm test:debug
```

**View test report:**
```bash
pnpm test:report
```

## Test Scenarios

### 1. P2P Connection Flow (`sandbox-p2p.spec.ts`)

**Main Test: "should establish P2P connection between two sandbox instances"**

1. **Session Initialization**: Peer A creates session and generates connection URL
2. **Connection Establishment**: Peer B uses URL to connect 
3. **Status Verification**: Both peers show "Connected" status
4. **Message Exchange**: Bidirectional test message sending
5. **Connection Quality**: Verifies WebRTC (preferred) or MQTT fallback

**Additional Tests:**
- Connection failure handling with invalid URLs
- Multiple connection attempts and reconnection scenarios

### 2. Test Architecture

**Browser Contexts**: Each peer runs in a separate browser context to simulate real users

**Test IDs**: Reliable element selection using `data-testid` attributes:
- `init-session-button` - Initialize session (Peer A)
- `connection-url` - Generated connection URL display
- `connection-url-input` - URL input field (Peer B)  
- `connect-session-button` - Connect to session (Peer B)
- `connection-status` - Connection status indicator
- `send-test-button` - Send test message
- `message-log` - Message display area

## Test Configuration

### Playwright Config (`playwright.config.ts`)

- **Test Directory**: `./e2e`
- **Browsers**: Chromium, Firefox, WebKit
- **Base URL**: `http://localhost:5173` (sandbox dev server)
- **Auto Server**: Starts sandbox automatically before tests
- **Timeouts**: Extended for P2P connection establishment (30s)

### Browser Support

**✅ Chromium**: Full WebRTC support, fastest connections
**🔄 Firefox**: Requires TURN servers, may fall back to MQTT
**🔄 WebKit**: Limited testing, basic functionality expected

## Test Data & Expectations

### Connection Types

1. **WebRTC (Ideal)**: Direct P2P connection, lowest latency
2. **MQTT (Fallback)**: Relay connection, still functional

### Timeouts

- **Session Init**: 10 seconds
- **Connection Establishment**: 30 seconds  
- **Message Exchange**: 10 seconds
- **Page Load**: Default Playwright timeouts

### Expected Flow Times

- **MQTT Connection**: ~2-5 seconds
- **WebRTC Upgrade**: ~5-15 seconds (browser dependent)
- **Message Round Trip**: <1 second

## Debugging Tests

### Visual Debugging

```bash
# Run with browser visible
pnpm test:headed

# Interactive mode with browser
pnpm test:ui

# Debug specific test with breakpoints
pnpm test:debug
```

### Debug Information

Tests log connection types and status for debugging:
```
Peer A Status: ✅ WebRTC Connected (P2P)
Peer B Status: ✅ WebRTC Connected (P2P)
```

### Common Issues

1. **Connection Timeout**: May indicate MQTT broker unavailability or WebRTC negotiation failure
2. **MQTT Only**: Expected on Firefox, check TURN server configuration
3. **Message Delivery**: Verify both P2P and relay pathways

## Extending Tests

### Adding New Test Cases

1. **Custom Message Types**: Test specific JSON-RPC methods
2. **Error Scenarios**: Network interruption, malformed messages
3. **Performance**: Connection time measurement, throughput testing
4. **Multi-Browser**: Cross-browser P2P connections

### Test Helpers

Use utilities in `utils/test-helpers.ts`:

```typescript
import { initializeSession, connectToSession, waitForConnection } from './utils/test-helpers';

// Initialize and connect
await initializeSession(peerAPage);
const url = await getConnectionUrl(peerAPage);
await connectToSession(peerBPage, url);
await waitForConnection(peerAPage, peerBPage);
```

## CI/CD Integration

Tests are configured for CI environments:

- **Retries**: 2 retries on failure in CI
- **Workers**: Single worker in CI to avoid resource conflicts
- **Artifacts**: Screenshots and videos on failure
- **Reports**: HTML reports with test details

## Future Test Scenarios

### Planned Additions

1. **Wallet Integration**: Test dApp ↔ Wallet connections
2. **Extension Testing**: Browser extension injection scenarios  
3. **Protocol Robustness**: Network interruption, reconnection logic
4. **Performance Benchmarking**: Connection time, message throughput
5. **Security Testing**: Connection encryption, session isolation

### Multi-Application Testing

Eventually expand to test the full ecosystem:

- **dApp Example** ↔ **Wallet Example** 
- **Browser Extension** injection testing
- **Cross-device** connections (mobile wallet simulation)

---

The test suite provides comprehensive validation of the OpenLV Protocol's core P2P functionality, ensuring reliable decentralized wallet connectivity.
