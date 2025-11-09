import type * as OLVP from "@openlv/modal";

type TriggerOpenModal = typeof OLVP.triggerOpenModal;

let modal: TriggerOpenModal | undefined;

export const getTriggerModal = async (): Promise<TriggerOpenModal> => {
  if (!modal) {
    const m = await import("@openlv/modal");

    modal = m.triggerOpenModal;
  }

  return modal;
};
