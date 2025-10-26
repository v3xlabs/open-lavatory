/* eslint-disable @typescript-eslint/no-unused-vars */
import { createConnector } from "@wagmi/core";

import { openlvDetails } from "./config";
import { createProvider, OpenLVProvider } from "@openlv/provider";

export type OpenLVConnectorParameters = unknown;
type ConnectorProperties = { foo: 'bar' };

export const openlv = (_parameters: OpenLVConnectorParameters) => {
  const provider = createProvider({ foo: 'bar' });

  return createConnector<OpenLVProvider, ConnectorProperties>((_wagmiConfig) => {
    // const chains = wagmiConfig.chains;
    // const transports = wagmiConfig.transports;

    return { ...openlvDetails, getProvider: () => provider,  };
  });
};
