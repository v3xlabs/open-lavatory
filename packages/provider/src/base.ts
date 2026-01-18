import { encodeConnectionURL, type SessionLinkParameters } from "@openlv/core";
import {
  createSession,
  type Session,
  type SessionStateObject,
} from "@openlv/session";
import { dynamicSignalingLayer } from "@openlv/signaling/dynamic";
import { Provider as OxProvider } from "ox";
import type { EventMap } from "ox/Provider";
import type { ExtractReturnType } from "ox/RpcSchema";
import { match } from "ts-pattern";
import type { Address, Prettify } from "viem";

import type { ProviderEvents } from "./events.js";
import type { RpcSchema } from "./rpc.js";
import {
  createProviderStorage,
  type ProviderStorageParameters,
  type ProviderStorageR,
} from "./storage/index.js";
import { log } from "./utils/log.js";

export type OpenLVProviderParameters = Prettify<
  {
    config?: object;
    openModal?: (provider: OpenLVProvider) => Promise<void>;
  } & Pick<ProviderStorageParameters, "storage">
>;

export const PROVIDER_STATUS = {
  STANDBY: "standby",
  CREATING: "creating",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error",
} as const;

export type ProviderStatus =
  (typeof PROVIDER_STATUS)[keyof typeof PROVIDER_STATUS];

export type ProviderState = {
  status: ProviderStatus;
  session?: SessionStateObject;
};

export type ProviderConfig = {
  schema: RpcSchema;
};

export type ProviderBase = {
  storage: ProviderStorageR;
  createSession: (parameters?: SessionLinkParameters) => Promise<Session>;
  closeSession: () => Promise<void>;
  getSession: () => Session | undefined;
  getAccounts: () => Promise<Address[]>;
  getState: () => ProviderState;
};

export type OpenLVProvider = OxProvider.Provider<
  { schema: RpcSchema },
  ProviderEvents & EventMap
> &
  ProviderBase;

/**
 * OpenLV Provider
 *
 * https://openlv.sh/api/provider
 */
export const createProvider = (
  _parameters: OpenLVProviderParameters,
): OpenLVProvider => {
  const oxEmitter = OxProvider.createEmitter<ProviderEvents & EventMap>();
  let session: Session | undefined;
  let status: ProviderStatus = PROVIDER_STATUS.STANDBY;
  const chainId: string = "1";
  let accounts: Address[] = [];
  const storage = createProviderStorage({ storage: _parameters.storage });
  const { openModal } = _parameters;

  const updateStatus = (newStatus: ProviderStatus) => {
    status = newStatus;
    log("updateStatus", status);
    oxEmitter.emit("status_change", newStatus);
  };

  const onMessage = async (message: object) => {
    log("onMessage", message);

    return { result: "success" };
  };

  const getAccounts = async (): Promise<Address[]> => {
    if (session) {
      return (await session.send({
        method: "eth_accounts",
        params: [],
      })) as Address[];
    }

    throw new Error("No session");
  };

  const start = async (
    parameters: SessionLinkParameters = {
      p: "mqtt",
      s: "wss://mqtt-dashboard.com:8884/mqtt",
    },
  ) => {
    updateStatus(PROVIDER_STATUS.CREATING);
    session = await createSession(
      parameters,
      await dynamicSignalingLayer(parameters.p),
      onMessage,
    );
    updateStatus(PROVIDER_STATUS.CONNECTING);

    log("session created");
    await session.connect();
    log("session connected");
    const handshakeParameters = session.getHandshakeParameters();
    const url = encodeConnectionURL(handshakeParameters);

    log("session url", url);
    oxEmitter.emit("session_started", session);

    await session.waitForLink();
    log("session linked");

    accounts = await getAccounts();

    updateStatus(PROVIDER_STATUS.CONNECTED);
    oxEmitter.emit("connect", { chainId });
    oxEmitter.emit("accountsChanged", accounts);

    return session;
  };
  const closeSession = async () => {
    await session?.close();
    session = undefined;
    updateStatus(PROVIDER_STATUS.STANDBY);
  };

  const request: OxProvider.from.Value<ProviderConfig>["request"] = async (
    request,
  ) => {
    log("ox request", request.method, request.params);

    return (
      match(request)
        .with({ method: "eth_chainId" }, async () => {
          log("eth_chainId");

          if (session) {
            log("sending eth_chainId to session");
            const result = await session.send(request);

            log("eth_chainId result from session", result);

            return result;
          }

          return "0x1";
        })
        .with({ method: "wallet_requestPermissions" }, () => {
          throw new Error("Not implemented");
          // console.log("wallet_requestPermissions", v.params);

          // return [] as ExtractReturnType<
          //   RpcSchema,
          //   "wallet_requestPermissions"
          // >;
        })
        .with({ method: "wallet_revokePermissions" }, async () => {
          await closeSession();

          return;
        })
        // TODO: if modal is enabled explicitly toggle the modal to show.
        .with({ method: "eth_requestAccounts" }, async () => {
          log("eth_requestAccounts");

          let provider: OpenLVProvider | undefined;

          if (oxProvider) {
            provider = oxProvider as OpenLVProvider;
          }

          if (openModal && provider) {
            await openModal(provider);

            await new Promise((resolve) => {
              provider?.on("connect", resolve);
              provider?.on("disconnect", resolve);
            });

            return await getAccounts();
          }

          const x = await start();

          log("x", x);

          return await getAccounts();
        })
        .with({ method: "eth_accounts" }, async () => {
          log("eth_accounts");

          return await getAccounts();
        })
        .otherwise(async (v) => {
          if (session) {
            log("sending request to session", request);
            const result = await session.send(request);

            log("result from session", result);

            return result;
          }

          throw new Error(`Method ${v.method} not supported`);
        }) as unknown as ExtractReturnType<RpcSchema, typeof request.method>
    );
  };
  const oxProvider = OxProvider.from<
    ProviderConfig,
    OxProvider.from.Value<ProviderConfig> &
      ProviderBase &
      OxProvider.Emitter<ProviderEvents & EventMap>
  >({
    ...oxEmitter,
    storage,
    request,
    getSession: () => session,
    getAccounts,
    createSession: start,
    closeSession,
    getState: () => ({ status, session: session?.getState() ?? undefined }),
  });

  return oxProvider as OpenLVProvider;
};
