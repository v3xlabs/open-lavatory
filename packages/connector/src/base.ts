/* eslint-disable @typescript-eslint/no-unused-vars */
import { createProvider, type OpenLVProvider } from "@openlv/provider";
import { createConnector } from "@wagmi/core";

import { openlvDetails } from "./config";
import { log } from "./log";
import { getTriggerModal } from "./modal";

export type OpenLVConnectorParameters = unknown;
// type ConnectorProperties = { foo: string };

export const openlv = (_parameters?: OpenLVConnectorParameters) => {
  const provider = createProvider({ foo: "bar" });

  const onDisconnect = async () => {
    log("onDisconnect called");
    await provider.closeSession();
  };

  return createConnector<OpenLVProvider>((wagmiConfig) => {
    const { chains } = wagmiConfig;
    // const transports = wagmiConfig.transports;

    const getAccounts = async () => {
      log("getAccounts");

      if (provider.getSession() === undefined) {
        return [];
      }

      return await provider.getAccounts();
    };

    return {
      ...openlvDetails,
      foo: "bar",
      async connect({ withCapabilities } = {}) {
        log("connect");

        const modal = await getTriggerModal();

        log("loading modal");
        modal?.(provider);

        const modalDismissed = new Promise((_resolve) => {
          // modal?.onClose
          // resolve();
        });

        const connectionCompleted = new Promise((_resolve) => {
          // modal?.onStartConnection
          // resolve();
          provider.emitter.on("status_change", (status) => {
            log("provider_status_change", status);

            if (status === "connected") {
              _resolve({});
            }
          });

          provider.emitter.on("accountsChanged", () => {
            log("provider_accountsChanged");
          });
        });

        await Promise.race([modalDismissed, connectionCompleted]);

        log("completing connect() call");

        const accounts = await provider.getAccounts();

        return {
          accounts: (withCapabilities
            ? accounts.map((account) => ({
                address: account,
                capabilities: {},
              }))
            : accounts) as never,
          chainId: 1,
          provider,
        };
      },
      async disconnect() {
        log("disconnect");
        await onDisconnect();
      },
      getAccounts,
      /**
       * Note on isAuthorized, upon page load `getProvider` is called, followed by `isAuthorized` if the result is true, the `connect` function is called.
       * This can be used for auto-reconnection / persistence if a connection exists.
       */
      async isAuthorized() {
        log("isAuthorized");

        return (await getAccounts()).length > 0;
      },
      async switchChain({ chainId }) {
        log("switchChain", chainId);

        // eslint-disable-next-line no-restricted-syntax
        const chain = chains.find((chain) => chain.id === chainId);

        if (!chain) throw new Error(`Chain ${chainId} not found`);

        // todo confirm with wallet

        return chain;
      },
      async getChainId() {
        return 1;
      },
      async getProvider() {
        log("getProvider");

        return provider;
      },
      onAccountsChanged() {
        log("onAccountsChanged");
      },
      onChainChanged() {
        log("onChainChanged");
      },
      async onDisconnect() {
        log("onDisconnect");
        await onDisconnect();
      },
    };
    // return connectorActions({ ...openlvDetails, getProvider: () => provider });
  });
};
