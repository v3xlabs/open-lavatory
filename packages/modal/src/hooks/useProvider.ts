import type { ProviderStatus } from "@openlv/provider";
import { useState } from "preact/hooks";

import { useModalContext } from "../context";
import { useEventEmitter } from "./useEventEmitter";

export const useProvider = () => {
  const { provider } = useModalContext();

  const [status, setStatus] = useState<ProviderStatus>(
    provider?.getState().status || "disconnected",
  );

  useEventEmitter(
    provider?.emitter,
    "status_change",
    (newStatus: ProviderStatus) => {
      setStatus(newStatus);
    },
  );

  if (!provider) throw new Error("Provider not found");

  return { provider, status };
};
