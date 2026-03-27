import { encodeConnectionURL, type SessionLinkParameters } from "@openlv/core";
import {
  createSession,
  type Session,
  type SessionStateObject,
} from "@openlv/session";
import { dynamicSignalingLayer } from "@openlv/signaling/dynamic";
import { webrtc, type WebRTCConfig } from "@openlv/transport/webrtc";
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
import type { SignalingProtocol } from "./storage/version.js";
import { log } from "./utils/log.js";

export type TransportProtocol = "webrtc";

export type OpenLVProviderConfig = {
  signaling?: {
    p?: SignalingProtocol;
    s?: Record<SignalingProtocol, string>;
  };
  transport?: {
    p?: TransportProtocol;
    s?: Record<TransportProtocol, WebRTCConfig>;
  };
};

export type OpenLVProviderParameters = Prettify<
  {
    config?: OpenLVProviderConfig;
    openModal?: (provider: OpenLVProvider) => Promise<void>;
    providerStorage?: ProviderStorageR;
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
  { schema: RpcSchema; },
  ProviderEvents & EventMap
> &
ProviderBase;

type transportInput =
  | {
    stun?: string[] | undefined;
    turn?:
      | {
        urls: string;
        username?: string | undefined;
        credential?: string | undefined;
      }[]
      | undefined;
  }
  | undefined;

const convertTempV1 = (transport: transportInput): WebRTCConfig => {
  const stun = transport?.stun?.map(url => ({ urls: url })) || [];
  const turn
    = transport?.turn?.map(server => ({
      urls: server.urls,
      username: server.username,
      credential: server.credential,
    })) || [];

  return {
    iceServers: [...stun, ...turn],
  };
};

/**
 * OpenLV Provider
 *
 * https://openlv.sh/api/provider
 */
export const createProvider = (
  parameters: OpenLVProviderParameters,
): OpenLVProvider => {
  const oxEmitter = OxProvider.createEmitter<ProviderEvents & EventMap>();
  let session: Session | undefined;
  let inFlightRequestAccounts: Promise<Address[]> | undefined;
  let status: ProviderStatus = PROVIDER_STATUS.STANDBY;
  let lastKnownChainId = "0x1";
  let accounts: Address[] = [];
  const storage
    = parameters.providerStorage
      ?? createProviderStorage({ storage: parameters.storage });
  const { openModal, config } = parameters;

  const updateStatus = (newStatus: ProviderStatus) => {
    status = newStatus;
    log("updateStatus", status);
    oxEmitter.emit("status_change", newStatus);
  };

  const ensureCurrentSession = (activeSession: Session, phase: string) => {
    if (session !== activeSession) {
      throw new Error(`Session closed during ${phase}`);
    }
  };

  // eslint-disable-next-line unicorn/consistent-function-scoping
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
    // eslint-disable-next-line unicorn/no-object-as-default-parameter
    parameters: SessionLinkParameters = {
      p: "mqtt",
      s: "wss://mqtt-dashboard.com:8884/mqtt",
    },
  ) => {
    updateStatus(PROVIDER_STATUS.CREATING);
    const transportOptions
      = convertTempV1(storage.getSettings().transport?.s?.webrtc)
        || config?.transport?.s?.webrtc;

    const activeSession = await createSession(
      parameters,
      await dynamicSignalingLayer(parameters.p),
      webrtc(transportOptions),
      onMessage,
    );

    session = activeSession;
    updateStatus(PROVIDER_STATUS.CONNECTING);

    log("session created");
    await activeSession.connect();
    ensureCurrentSession(activeSession, "connect");

    log("session connected");
    const handshakeParameters = activeSession.getHandshakeParameters();
    const url = encodeConnectionURL(handshakeParameters);

    log("session url", url);
    oxEmitter.emit("session_started", activeSession);

    await activeSession.waitForLink();
    ensureCurrentSession(activeSession, "link");

    log("session linked");

    accounts = (await activeSession.send({
      method: "eth_accounts",
      params: [],
    })) as Address[];
    ensureCurrentSession(activeSession, "eth_accounts");

    const chainIdHex = (await activeSession.send({
      method: "eth_chainId",
      params: [],
    })) as string;

    ensureCurrentSession(activeSession, "eth_chainId");

    lastKnownChainId = chainIdHex;

    updateStatus(PROVIDER_STATUS.CONNECTED);
    oxEmitter.emit("connect", { chainId: chainIdHex });
    oxEmitter.emit("accountsChanged", accounts);

    return activeSession;
  };
  const closeSession = async () => {
    inFlightRequestAccounts = undefined;
    const oldSession = session;

    session = undefined;
    accounts = [];

    try {
      await oldSession?.close();
    }
    catch (error) {
      log("error closing session", error);
    }

    if (!session) {
      updateStatus(PROVIDER_STATUS.STANDBY);
    }
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

            if (typeof result === "string") {
              lastKnownChainId = result;
            }

            log("eth_chainId result from session", result);

            return result;
          }

          return lastKnownChainId;
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

          if (status === PROVIDER_STATUS.CONNECTED) {
            return await getAccounts();
          }

          if (inFlightRequestAccounts) {
            return await inFlightRequestAccounts;
          }

          inFlightRequestAccounts = (async () => {
            let provider: OpenLVProvider | undefined;

            if (oxProvider) {
              provider = oxProvider as OpenLVProvider;
            }

            if (openModal && provider) {
              let resolveWait: (() => void) | undefined;
              const waitForCompletion = new Promise<void>((resolve) => {
                resolveWait = resolve;
              });

              const finish = () => {
                provider.off("connect", onConnect);
                provider.off("status_change", onStatusChange);
                resolveWait?.();
              };

              const onConnect = () => {
                finish();
              };

              const onStatusChange = (nextStatus: ProviderStatus) => {
                if (
                  nextStatus === PROVIDER_STATUS.STANDBY
                  || nextStatus === PROVIDER_STATUS.ERROR
                ) {
                  finish();
                }
              };

              provider.on("connect", onConnect);
              provider.on("status_change", onStatusChange);

              try {
                await openModal(provider);
                await waitForCompletion;
              }
              catch (error) {
                finish();
                throw error;
              }

              if (
                provider.getState().status !== PROVIDER_STATUS.CONNECTED
                || !provider.getSession()
              ) {
                throw new OxProvider.ProviderRpcError(
                  4001,
                  "User rejected the request",
                );
              }

              return await getAccounts();
            }

            await start();

            return await getAccounts();
          })();

          try {
            return await inFlightRequestAccounts;
          }
          finally {
            inFlightRequestAccounts = undefined;
          }
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
