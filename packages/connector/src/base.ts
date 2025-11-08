/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  createProvider,
  type OpenLVProvider,
  type OpenLVProviderParameters,
} from "@openlv/provider";
import { createConnector, type CreateConnectorFn } from "@wagmi/core";
import type { Prettify } from "viem";

import { openlvDetails } from "./config";
import { log } from "./log";
import { getTriggerModal } from "./modal";

export type OpenLVConnectorParameters = Prettify<
  Pick<OpenLVProviderParameters, "config" | "storage">
>;

export type OpenLVConnector = CreateConnectorFn<
  OpenLVProvider,
  Record<string, unknown>,
  Record<string, unknown>
>;

/*
 * openlv connector
 * https://openlv.sh/
 */
export const openlv = ({
  storage,
  config = {},
}: OpenLVConnectorParameters = {}) => {
  const provider = createProvider({ storage, config });

  const onDisconnect = async () => {
    log("onDisconnect called");
    await provider[Symbol.asyncDispose]();
  };

  return createConnector<OpenLVProvider>((wagmiConfig) => {
    const { chains } = wagmiConfig;

    const getAccounts = async () => {
      log("getAccounts");

      if (provider.getSession() === undefined) {
        return [];
      }

      return await provider.getAccounts();
    };

    const connect = async (
      { withCapabilities } = { withCapabilities: false },
    ) => {
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
        provider.on("status_change", (status) => {
          log("provider_status_change", status);

          if (status === "connected") {
            _resolve({});
          }
        });

        provider.on("accountsChanged", () => {
          log("provider_accountsChanged");
        });
      });

      await Promise.race([modalDismissed, connectionCompleted]);

      const accounts = await provider.getAccounts();
      const chainId = 1;

      log("completing connect() call");

      return {
        accounts: (withCapabilities
          ? accounts.map((account) => ({
              address: account,
              capabilities: {},
            }))
          : accounts) as never,
        chainId,
        provider,
      };
    };

    return {
      ...openlvDetails,
      foo: "bar",
      connect,
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
      getChainId: async () => 1,
      getProvider: async () => provider,
      onAccountsChanged: () => log("onAccountsChanged"),
      onChainChanged: () => log("onChainChanged"),
      onDisconnect,
    };
  });
};
