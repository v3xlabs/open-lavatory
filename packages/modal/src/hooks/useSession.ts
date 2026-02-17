import { encodeConnectionURL } from "@openlv/core";
import { createMemo } from "solid-js";

import { useModalContext } from "../context.js";
import { useSettings } from "./useSettings.js";

export const useSession = () => {
  const { session, sessionState } = useModalContext();
  const parameters = createMemo(() => session()?.getHandshakeParameters());
  const uri = createMemo(() => {
    const handshakeParameters = parameters();

    return handshakeParameters
      ? encodeConnectionURL(handshakeParameters)
      : undefined;
  });

  return {
    uri,
    status: sessionState,
  };
};

export const useSessionStart = () => {
  const { provider } = useModalContext();
  const { settings } = useSettings();

  return {
    start: () => {
      const currentSettings = settings();
      const p = currentSettings?.signaling?.p;
      const s = p ? currentSettings?.signaling?.s?.[p] : undefined;

      if (!p || !s) {
        throw new Error("Invalid protocol or server");
      }

      return provider.createSession({
        p,
        s,
      });
    },
  };
};
