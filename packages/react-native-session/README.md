# @openlv/react-native-session

A lightweight React Native shim around `@openlv/session`.

## What it does

- Re-exports the `@openlv/session` public API (so it can be close to a drop-in replacement).
- Provides a single all-inclusive React provider that installs required polyfills (WebRTC + WebCrypto + randomness).

## Install

This package expects you to install the native dependency in your React Native app:

- `react-native-webrtc`
- `react-native-webview`
- `react-native-webview-crypto`
- `react-native-get-random-values`

## Usage

Wrap your app once:

```tsx
import { OpenLVProvider } from "@openlv/react-native-session/provider";

export function App() {
  return (
    <OpenLVProvider>
      {/* your app */}
    </OpenLVProvider>
  );
}
```

Then use it like `@openlv/session` (no extra polyfill calls):

```ts
import { connectSession } from "@openlv/react-native-session";

const session = await connectSession("openlv://...", async (msg) => {
  // ...handle requests...
  return { result: "ok" };
});

await session.connect();
```

## Notes

- `react-native-webview-crypto` requires rendering a component (the provider handles this).
- If native dependencies are missing, the provider will throw a clear error at startup.
