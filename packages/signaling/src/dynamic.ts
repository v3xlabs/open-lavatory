import { match } from "ts-pattern";

/**
 * Imports the signaling layer based on the protocol at runtime
 *
 * TODO: Make this a built-in feature of session/provider
 */
export const dynamicSignalingLayer = async (protocol: string) => {
  return match(protocol)
    .with("mqtt", async () => (await import("./mqtt/index.js"))["mqtt"])
    .with("ntfy", async () => (await import("./ntfy/index.js"))["ntfy"])
    .with("gun", async () => (await import("./gundb/index.js"))["gundb"])
    .otherwise(() => {
      throw new Error(`Unknown signaling protocol: ${protocol}`);
    });
};
