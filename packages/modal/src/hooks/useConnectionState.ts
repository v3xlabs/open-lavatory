import { useCallback, useState } from "preact/hooks";

import type { ConnectionInfo, ConnectionState } from "../types/connection.js";

export const useConnectionState = (initialState: ConnectionState = "idle") => {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    state: initialState,
  });

  const updateState = useCallback(
    (newState: ConnectionState, additionalInfo?: Partial<ConnectionInfo>) => {
      setConnectionInfo((prev) => ({
        ...prev,
        state: newState,
        ...additionalInfo,
      }));
    },
    [],
  );

  const updateConnectionInfo = useCallback((info: ConnectionInfo) => {
    setConnectionInfo(info);
  }, []);

  const reset = useCallback(() => {
    setConnectionInfo({ state: "idle" });
  }, []);

  return {
    connectionInfo,
    updateState,
    updateConnectionInfo,
    reset,
  };
};
