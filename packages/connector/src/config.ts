import { OPENLV_ICON_128_WHITE } from "@openlv/core/icons";
import type { CreateConnectorFn } from "@wagmi/core";

type ConnectorDetails = Pick<
  ReturnType<CreateConnectorFn>,
  "id" | "name" | "type" | "icon" | "rdns"
>;

export const openlvDetails: ConnectorDetails = {
  // eslint-disable-next-line no-restricted-syntax
  id: "openLv",
  name: "Open Lavatory",
  type: "openLv",
  icon: OPENLV_ICON_128_WHITE,
  rdns: "company.v3x.openlv",
} as const;
