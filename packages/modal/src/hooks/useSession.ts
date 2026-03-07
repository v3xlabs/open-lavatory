import { encodeConnectionURL } from "@openlv/core";
import type { SessionStateObject } from "@openlv/session";
import { createMemo, createSignal, onCleanup, onMount } from "solid-js";

import { useModalContext } from "../context.js";

export const useSession = () => {
  const { provider } = useModalContext();
  const session = createMemo(() => provider.getSession(), undefined, { name: "session" });
  const [status, setStatus] = createSignal<SessionStateObject | undefined>(session()?.getState());

  console.log("session status", status());

  const handleStateChange = (state?: SessionStateObject) => {
    console.log("session state change", state);
    setStatus(state);
  };

  onMount(() => {
    session()?.emitter.on("state_change", handleStateChange);
  });

  onCleanup(() => {
    session()?.emitter.off("state_change", handleStateChange);
  });

  const parameters = createMemo(() => session()?.getHandshakeParameters());
  const uri = createMemo(() => {
    const handshakeParameters = parameters();

    return handshakeParameters
      ? encodeConnectionURL(handshakeParameters)
      : undefined;
  });

  return {
    uri,
    status,
  };
};

export const useSessionStart = () => {
  const { provider } = useModalContext();

  return {
    start: () => {
      const currentSettings = provider.storage.getSettings();
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
