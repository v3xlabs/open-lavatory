import type { OpenLVModalElementProps } from "@openlv/modal";
import {
  createProvider,
  type OpenLVProvider,
  type OpenLVProviderParameters,
} from "@openlv/provider";
import { createConnector, type CreateConnectorFn } from "@wagmi/core";
import { type Prettify, UserRejectedRequestError } from "viem";

import { openlvDetails } from "./config.js";
import { log } from "./log.js";
import { getTriggerModal } from "./modal.js";

export type OpenLVConnectorParameters = Prettify<
  Pick<OpenLVProviderParameters, "config" | "storage"> &
  Pick<OpenLVModalElementProps, "theme">
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
  theme,
}: OpenLVConnectorParameters = {}) => {
  const provider = createProvider({
    storage,
    config,
  });

  const onDisconnect = async () => {
    log("onDisconnect called");
    await provider.closeSession();
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

      const modalDismissed = new Promise<void>((resolve) => {
        modal?.({ theme, provider, onClose: () => resolve() });
      });

      const connectionCompleted = new Promise<void>((resolve) => {
        provider.on("status_change", (status) => {
          log("provider_status_change", status);

          if (status === "connected") {
            resolve();
          }
        });

        provider.on("accountsChanged", () => {
          log("provider_accountsChanged");
        });
      });

      await Promise.race([modalDismissed, connectionCompleted]);

      if (
        !provider.getSession()
        || provider.getState().status !== "connected"
      ) {
        provider.closeSession();

        throw new UserRejectedRequestError(new Error("User closed modal"));
      }

      const accounts = await provider.getAccounts();

      const chainIdHex = await provider.request({ method: "eth_chainId" });
      const chainId = Number.parseInt(chainIdHex as string, 16);

      log("completing connect() call with chainId", chainId);

      return {
        accounts: (withCapabilities
          ? accounts.map(account => ({
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
        const chain = chains.find(chain => chain.id === chainId);

        if (!chain) throw new Error(`Chain ${chainId} not found`);

        // todo confirm with wallet

        return chain;
      },
      getChainId: async () => {
        const chainIdHex = await provider.request({ method: "eth_chainId" });

        return Number.parseInt(chainIdHex as string, 16);
      },
      getProvider: async () => provider,
      onAccountsChanged: () => log("onAccountsChanged"),
      onChainChanged: () => log("onChainChanged"),
      onDisconnect,
    };
  });
};
