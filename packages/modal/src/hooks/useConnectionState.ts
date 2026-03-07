import { createSignal } from "solid-js";

import type { ConnectionInfo, ConnectionState } from "../types/connection.js";

export const useConnectionState = (initialState: ConnectionState = "idle") => {
  const [connectionInfo, setConnectionInfo] = createSignal<ConnectionInfo>({
    state: initialState,
  });

  const updateState = (
    newState: ConnectionState,
    additionalInfo?: Partial<ConnectionInfo>,
  ) => {
    setConnectionInfo(previous => ({
      ...previous,
      state: newState,
      ...additionalInfo,
    }));
  };

  const updateConnectionInfo = (info: ConnectionInfo) => {
    setConnectionInfo(info);
  };

  const reset = () => {
    setConnectionInfo({ state: "idle" });
  };

  return {
    connectionInfo,
    updateState,
    updateConnectionInfo,
    reset,
  };
};
