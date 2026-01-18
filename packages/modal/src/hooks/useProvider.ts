import { PROVIDER_STATUS, type ProviderStatus } from "@openlv/provider";
import { useEffect, useState } from "preact/hooks";

import { useModalContext } from "../context.js";

export const useProvider = () => {
  const { provider } = useModalContext();

  const [status, setStatus] = useState<ProviderStatus>(
    provider?.getState().status || PROVIDER_STATUS.ERROR,
  );

  useEffect(() => {
    const onStatusChange = (newStatus: ProviderStatus) => {
      setStatus(newStatus);
    };

    provider?.on("status_change", onStatusChange);

    const currentStatus = provider?.getState().status;

    if (currentStatus) {
      setStatus(currentStatus);
    }

    return () => {
      provider?.off("status_change", onStatusChange);
    };
  }, [provider]);

  if (!provider) throw new Error("Provider not found");

  return { provider, status };
};
