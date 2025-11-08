import type { ProviderStatus } from "@openlv/provider";
import { useEffect, useState } from "preact/hooks";

import { useModalContext } from "../context";

export const useProvider = () => {
  const { provider } = useModalContext();

  const [status, setStatus] = useState<ProviderStatus>(
    provider?.getState().status || "disconnected",
  );

  useEffect(() => {
    const onStatusChange = (newStatus: ProviderStatus) => {
      setStatus(newStatus);
    };

    provider?.on("status_change", onStatusChange);

    return () => {
      provider?.off("status_change", onStatusChange);
    };
  }, [provider]);

  if (!provider) throw new Error("Provider not found");

  return { provider, status };
};
