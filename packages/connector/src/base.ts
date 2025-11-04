/* eslint-disable @typescript-eslint/no-unused-vars */
import { createProvider, type OpenLVProvider } from "@openlv/provider";
import { createConnector } from "@wagmi/core";
import type { Address } from "viem";

import { openlvDetails } from "./config";
import { log } from "./log";
import { getTriggerModal } from "./modal";

export type OpenLVConnectorParameters = unknown;
// type ConnectorProperties = { foo: string };

export const openlv = (_parameters?: OpenLVConnectorParameters) => {
  const provider = createProvider({ foo: "bar" });
  let accounts: Address[] = [];

  const onDisconnect = async () => {
    log("onDisconnect called");
    accounts = [];
    await provider.closeSession();
  };

  return createConnector<OpenLVProvider>((wagmiConfig) => {
    const { chains } = wagmiConfig;
    // const transports = wagmiConfig.transports;

    return {
      ...openlvDetails,
      foo: "bar",
      async connect() {
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

        // if sessions fails close modal

        return {
          accounts: [],
          chainId: 1,
          provider,
        };
      },
      async disconnect() {
        log("disconnect");
        await onDisconnect();
      },
      async getAccounts() {
        log("getAccounts");

        const session = provider.getSession();

        if (session) {
          if (session.getState().status === "connected") {
            log("session is connected, sending eth_accounts");
            //

            // temp measure, figure out debouncing / periodic refetching later
            if (accounts.length > 0) return accounts;

            const x = await session.send({
              method: "eth_accounts",
              params: [],
              // eslint-disable-next-line no-restricted-syntax
              id: 1,
              jsonrpc: "2.0",
            });

            log("eth_accounts", x);
            // @ts-ignore
            accounts = (x as any) || [];

            return accounts;
          }
        }

        return [];
      },
      /**
       * Note on isAuthorized, upon page load `getProvider` is called, followed by `isAuthorized` if the result is true, the `connect` function is called.
       * This can be used for auto-reconnection / persistence if a connection exists.
       */
      async isAuthorized() {
        log("isAuthorized");

        return accounts.length > 0;
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
