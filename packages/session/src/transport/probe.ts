import type { SessionMessage } from "../messages/index.js";
import { log } from "../utils/log.js";

export interface TransportProbeContext {
  status: string;
  transportConnected: boolean;
  transportHelloAcked: boolean;
  sent: boolean;
  sendViaTransport: (msg: SessionMessage) => Promise<void>;
}

export async function maybeSendTransportProbe(
  ctx: TransportProbeContext,
): Promise<boolean> {
  if (ctx.sent) return true;

  if (
    ctx.status !== "connected" ||
    !ctx.transportConnected ||
    !ctx.transportHelloAcked
  )
    return ctx.sent;

  const probe: SessionMessage = {
    type: "request",
    messageId: crypto.randomUUID(),
    payload: { __openlv_transport_probe: true, ts: Date.now() },
  };

  try {
    await ctx.sendViaTransport(probe);
    log("Transport probe sent without fallback");

    return true;
  } catch {
    return ctx.sent;
  }
}
