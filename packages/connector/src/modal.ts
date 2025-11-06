import type { ConnectorStorage } from "@openlv/core";
import type { OpenLVProvider } from "@openlv/provider";

let modal:
  | ((provider: OpenLVProvider, storage: ConnectorStorage) => void)
  | undefined;

export const getTriggerModal = async () => {
  if (!modal) {
    modal = await import("@openlv/modal").then((m) => m.triggerOpenModal);
  }

  return modal;
};
