import type { DecryptionKey } from "@openlv/core/encryption";
import type { EventEmitter } from "eventemitter3";

import type {
  SessionMessage,
  SessionMessageResponse,
} from "../messages/index.js";

export async function handleTransportData(params: {
  body: string;
  decryptionKey: DecryptionKey | undefined;
  onMessage: (message: object) => Promise<object>;
  sendViaBestPath: (msg: SessionMessage) => Promise<void>;
  messages: EventEmitter<{ message: SessionMessage }>;
}): Promise<void> {
  const { decryptionKey, body, onMessage, sendViaBestPath, messages } = params;

  if (!decryptionKey) return;

  const decrypted = await decryptionKey.decrypt(body);
  const sessionMsg = JSON.parse(decrypted) as SessionMessage;

  if (sessionMsg.type === "response") {
    messages.emit("message", sessionMsg);

    return;
  }

  if (sessionMsg.type === "request") {
    const payload = await onMessage(sessionMsg.payload);
    const responseMessage: SessionMessageResponse = {
      type: "response",
      messageId: sessionMsg.messageId,
      payload,
    };

    await sendViaBestPath(responseMessage);
  }
}
