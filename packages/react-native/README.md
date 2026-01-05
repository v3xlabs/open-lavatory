# @openlv/react-native

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

Include the provider around the parts of your app that use OpenLV:

```tsx
import { OpenLVProvider } from "@openlv/react-native/provider";

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
import { connectSession } from "@openlv/react-native";

const session = await connectSession("openlv://...", async (msg) => {
  // ...handle requests...
  return "ok";
});

await session.connect();
```
