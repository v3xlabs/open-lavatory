# Repository Guidelines

## Source-of-Truth Order
When sources conflict, follow this precedence:

1. `packages/*/src` implementation
2. Package export surfaces (`packages/*/package.json` `exports` fields)
3. Root tooling config (`biome.json`, `eslint.config.mjs`, `tsconfig.base.json`)
4. Docs (`docs/`), especially `docs/specs/` for protocol intent
5. Examples (`examples/`) for usage patterns only, not strict style baseline

Notes:
- `docs/pages/api/*` is partially incomplete (`TODO` stubs).
- `docs/dist/` is generated output and should not be edited as source.
- `docs/specs/001_initial.md` is historical design intent from early development; canonical runtime behavior is defined by current `packages/*/src` implementation.

## Monorepo Topology
Workspace is a TypeScript monorepo (`pnpm`). Primary package graph:

- `@openlv/core`: core types/utilities (URL encoding, encryption, errors, shared types)
- `@openlv/signaling`: signaling abstraction + providers (`mqtt`, `ntfy`, `gundb`, dynamic loader)
- `@openlv/transport`: transport abstraction + `webrtc`
- `@openlv/session`: connection lifecycle orchestrator combining signaling + transport
- `@openlv/provider`: EIP-1193-style provider over sessions + persisted settings
- `@openlv/modal`: Preact modal + custom element wrapper for wallet UX
- `@openlv/connector`: Wagmi connector integrating provider + modal
- `@openlv/react-native`: React Native compatibility layer/polyfills around session APIs
- `@openlv/extension`: WIP browser extension implementation

Engineering baseline for style and architecture:
- Primary baseline: `packages/core`, `packages/signaling`, `packages/transport`, `packages/session`, `packages/provider`, `packages/connector`, `packages/modal`, `packages/react-native`
- Lower-confidence baseline (WIP/demo): `packages/extension`, `examples/`

## Protocol Model (Implementation-Oriented)
OpenLV establishes dApp-wallet JSON-RPC connectivity in phases:

1. Session creation
- dApp creates session parameters (`sessionId`, signaling protocol/server, handshake key material)
- URI generated via `encodeConnectionURL`

2. Signaling handshake
- Wallet parses URI (`decodeConnectionURL`)
- Peers discover each other over signaling layer
- Symmetric handshake + asymmetric key exchange occurs via signaling messages

3. Transport setup
- After signaling reaches encrypted state, transport (`webrtc`) is set up
- Offer/answer/candidate exchange flows through signaling path
- Transport transitions to connected and is used for payload transfer

4. JSON-RPC request/response
- Provider/session send request objects and await matched responses by message id

Important implementation details:
- Signaling protocols currently implemented: `mqtt`, `ntfy`, `gun`
- Transport currently implemented: `webrtc`
- Runtime protocol selection: `dynamicSignalingLayer(protocol)`

## Protocol/State Invariants
Use and preserve existing state/event conventions:

- State constants modeled as `as const` objects + derived union types
  - `SIGNAL_STATE`, `TRANSPORT_STATE`, `SESSION_STATE`, `PROVIDER_STATUS`
- State transition notifications emitted via typed event maps (`state_change`)
- Cross-layer communication uses `eventemitter3` with typed events
- Public API returns plain object contracts (factory-composed), not class-heavy APIs

Session lifecycle semantics:
- `createSession(...).connect()` initializes signaling and transport
- `waitForLink()` resolves when session reaches connected state
- `send(message, timeout)` sends request and resolves with correlated response payload

## URI and Handshake Notes
Documented intent exists in `docs/specs/001_initial.md` and `docs/pages/api/uri.mdx`; implementation is authoritative.

Current implementation characteristics (`packages/core/src/url/index.ts`):
- Scheme: `openlv://`
- Version host: `@1`
- Required params: `h`, `k`
- Optional params: `p`, `s`
- Session id validation: 16 URL-safe characters
- `h` validation: 16 lowercase hex chars
- `k` validation: 32 lowercase hex chars (implementation reality)

If editing URI behavior:
- Update `encodeConnectionURL` and `decodeConnectionURL` together
- Update/add tests in `packages/core/src/url/index.test.ts`
- Reconcile docs if behavior changes

## Build/Test/Lint Commands
Run from repository root unless package-scoped.

- `pnpm build`: recursive package build (root filters out docs/examples/extension)
- `pnpm test`: recursive tests (root filters out tests workspace + extension)
- `pnpm lint`
- `pnpm lint:fix`
- `pnpm changeset` for publishable package changes

Useful package-scoped execution:
- `pnpm --filter @openlv/<package> build`
- `pnpm --filter @openlv/<package> test`

## Coding Standards
Baseline rules carried from prior project guidance and aligned to this repo.

### Architectural style
- Prefer function-oriented and factory-oriented design
- Avoid classes except narrow runtime integration points
- Prefer explicit composition (`createX`, helper combinators) over inheritance
- Keep module boundaries explicit between signaling/transport/session/provider layers

### TypeScript style
- Prefer `type` over `interface` in general
- Keep types close to usage; avoid central type dump files
- Prefer `const fn = (...) => {}` for most function definitions
- Minimize `as unknown` casts; restrict them to interop boundaries
- Use discriminated unions and `ts-pattern` where it improves exhaustiveness and clarity
- Use descriptive identifiers; avoid generic `id` names

### Naming
- `camelCase`: variables/functions
- `PascalCase`: types/components
- kebab-case: directories/packages
- Existing event names use snake_case (`state_change`, `settings_change`) and should be preserved for compatibility

### Exports/imports
- Prefer named exports
- Default exports are exceptions in constrained contexts:
  - tooling/config entrypoints (`vite`, `vitest`, `wxt`)
  - modal custom-element entrypoint patterns currently used in `@openlv/modal`
- Use NodeNext-style relative imports with explicit `.js` extension in TS source
- Respect package `exports` maps when adding/removing public modules

### Logging
- Prefer existing local `log` helpers (`src/utils/log.ts`) where available
- Avoid introducing noisy console output in stable library paths
- Keep temporary debug logging localized and removable

## Lint/Format/Compiler Constraints
From active repo tooling:

- Formatter/linter: Biome + ESLint
- Formatting: 4 spaces, single quotes, trailing commas, semicolons, ~80 line width
- TypeScript: strict mode, no unused locals/params, NodeNext module resolution

Behavioral constraints to respect:
- No default exports (ESLint) except configured exceptions/files
- Import sorting and unused import cleanup are enforced
- Restriction on generic identifier name `id`
- `noBarrelFile`/`noReExportAll` are enabled in Biome; package entrypoints explicitly opt out where needed

## Testing Conventions
- Co-located tests in package source: `src/*.test.ts`
- Test framework: Vitest
- Tests should validate behavior/state transitions and protocol boundaries
- For async/network-like tests, keep deterministic setup and explicit timeouts
- When changing parsing/migration/state logic, add regression tests adjacent to affected module

## Package-Specific Implementation Notes

### `@openlv/provider`
- Provider wraps session and emits EIP-1193-compatible events
- Settings persistence + migration handled in `src/storage/version.ts` (zod schemas + migration chain)
- Storage schema versioning is a compatibility boundary; migration changes require tests

### `@openlv/session`
- Core orchestrator for signaling + transport
- Maintains session status and message correlation
- Changes here can cascade into provider, modal, connector behavior

### `@openlv/signaling`
- `createSignalingLayer` provides common handshake/encryption flow
- Protocol adapters should remain thin wrappers (setup/publish/subscribe/teardown)
- Keep dynamic protocol loading behavior stable (`dynamic.ts`)

### `@openlv/transport`
- `createTransportBase` abstracts offer/answer/candidate/message wiring
- `webrtc` is current transport implementation; preserve state and event contract

### `@openlv/modal`
- Preact + hooks + custom element wrapper
- Uses provider state/events and storage settings for runtime behavior
- Accessibility/theming behavior is centralized across hooks/components

### `@openlv/react-native`
- Explicitly interop-heavy package: polyfills and global patching are expected
- Defensive runtime checks (crypto/web APIs) are part of contract
- Keep casts and global writes isolated and documented

### `@openlv/extension`
- Marked WIP; do not treat it as strict architecture/style template for core libs

## Changeset/Release Policy
For changes in publishable packages under `packages/*`:
- Add a changeset (`pnpm changeset`) unless explicitly doing non-release internal work
- Ensure package API changes align with `exports` in each `package.json`

## Agent Execution Checklist
Before finishing substantial edits in `packages/`:

1. Confirm boundary correctness
- No accidental cross-layer leakage (e.g., provider logic inside transport)

2. Confirm API compatibility
- Public exports unchanged unless intentionally versioned

3. Confirm style/tooling alignment
- Import style, naming, type style, lint compatibility

4. Confirm tests
- Add/adjust co-located tests for new behavior
- Run relevant package tests; run root tests for broad changes

5. Confirm documentation drift
- If protocol/runtime behavior changed, update docs or note drift explicitly
