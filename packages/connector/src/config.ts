import { CreateConnectorFn } from "@wagmi/core";

import { OPENLV_ICON_128 } from "./icon";

type ConnectorDetails = Pick<
  ReturnType<CreateConnectorFn>,
  "id" | "name" | "type" | "icon" | "rdns"
>;

export const openlvDetails: ConnectorDetails = {
  id: "openLv",
  name: "Open Lavatory",
  type: "openLv",
  icon: OPENLV_ICON_128,
  rdns: "company.v3x.openlv",
};
