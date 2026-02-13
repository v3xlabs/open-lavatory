import { match } from "ts-pattern";

/**
 * Imports the signaling layer based on the protocol at runtime
 *
 * TODO: Make this a built-in feature of session/provider
 */
export const dynamicSignalingLayer = async (protocol: string) => match(protocol)
  .with("mqtt", async () => {
    const mod = await import("./mqtt/index.js");

    return mod.mqtt;
  })
  .with("ntfy", async () => {
    const mod = await import("./ntfy/index.js");

    return mod.ntfy;
  })
  .with("gun", async () => {
    const mod = await import("./gundb/index.js");

    return mod.gundb;
  })
  .otherwise(() => {
    throw new Error(`Unknown signaling protocol: ${protocol}`);
  });
