
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

const convertTempV1 = (transport: transportInput): WebRTCConfig | undefined => {
  if (!transport) return undefined;

  const stun = transport.stun?.map(url => ({ urls: url })) || [];
  const turn
    = transport.turn?.map(server => ({
      urls: server.urls,
      username: server.username,
      credential: server.credential,
    })) || [];

  const iceServers = [...stun, ...turn];

  return { iceServers };
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
  const storage = createProviderStorage({ storage: parameters.storage });
  const { openModal, config } = parameters;

  const updateStatus = (newStatus: ProviderStatus) => {
    status = newStatus;
    log("updateStatus", status);
    oxEmitter.emit("status_change", newStatus);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onMessage = async (message: any) => {
    log("onMessage", message);

    if (message && typeof message === "object" && "method" in message) {
      switch (message.method) {
        case "accountsChanged": {
          accounts = (
            Array.isArray(message.params?.[0])
              ? message.params[0]
              : message.params
          ) as Address[];
          oxEmitter.emit("accountsChanged", accounts);

          break;
        }
        case "chainChanged": {
          const chainId = Array.isArray(message.params)
            ? message.params[0]
            : message.params;

          if (typeof chainId === "string") {
            lastKnownChainId = chainId;
          }

          oxEmitter.emit("chainChanged", chainId);

          break;
        }
        case "disconnect": {
          const error = Array.isArray(message.params)
            ? message.params[0]
            : (message.error ?? message.params);

          oxEmitter.emit("disconnect", error);

          break;
        }
      }
    }

    return message;
  };

  const getAccounts = async (): Promise<Address[]> => {
    if (session) {
      return (await session.send({
        method: "eth_accounts",
        params: [],
      })) as Address[];
    }

    return [];
  };

  const start = async (
    parameters?: SessionLinkParameters,
  ) => {
    if (session && status !== PROVIDER_STATUS.STANDBY) {
      return session;
    }

    const currentSettings = storage.getSettings();

    const p = parameters?.p || currentSettings.signaling?.p || config?.signaling?.p || "mqtt";
    let s = parameters?.s;

    if (!s) {
      s = parameters?.p ? currentSettings.signaling?.s?.[parameters.p as keyof NonNullable<typeof currentSettings.signaling>["s"]] || config?.signaling?.s?.[parameters.p as keyof NonNullable<typeof config.signaling>["s"]] : currentSettings.signaling?.s?.[p as keyof NonNullable<typeof currentSettings.signaling>["s"]] || config?.signaling?.s?.[p as keyof NonNullable<typeof config.signaling>["s"]];
    }

    // Fallback default
    if (!s) {
      s = "wss://test.mosquitto.org:8081/mqtt";
    }

    const resolvedParameters: SessionLinkParameters = { p, s };

    updateStatus(PROVIDER_STATUS.CREATING);
    const transportOptions
      = convertTempV1(currentSettings.transport?.s?.webrtc)
        || config?.transport?.s?.webrtc;

    session = await createSession(
      resolvedParameters,
      await dynamicSignalingLayer(resolvedParameters.p),
      webrtc(transportOptions),
      onMessage,
    );
    updateStatus(PROVIDER_STATUS.CONNECTING);

    log("session created");
    await session.connect();

    // Session can be closed while connect is in-flight.
    if (!session) {
      throw new Error("Session closed during connect");
    }

    log("session connected");
    const handshakeParameters = session.getHandshakeParameters();
    const url = encodeConnectionURL(handshakeParameters);

    log("session url", url);
    oxEmitter.emit("session_started", session);

    await session.waitForLink();

    // Session can be closed while link is in-flight.
    if (!session) {
      throw new Error("Session closed during link");
    }

    log("session linked");

    accounts = await getAccounts();

    if (!session) {
      throw new Error("Session closed during eth_accounts");
    }

    const chainIdHex = (await session.send({
      method: "eth_chainId",
      params: [],
    })) as string;

    lastKnownChainId = chainIdHex;

    updateStatus(PROVIDER_STATUS.CONNECTED);
    oxEmitter.emit("connect", { chainId: chainIdHex });
    oxEmitter.emit("accountsChanged", accounts);

    return session;
  };
  const closeSession = async () => {
    console.trace("closeSession trace");
    inFlightRequestAccounts = undefined;

    try {
      await session?.close();
    }
    catch (error) {
      log("error closing session", error);
    }

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
              await openModal(provider);

              await new Promise((resolve) => {
                const handler = () => {
                  provider?.off("connect", handler);
                  provider?.off("disconnect", handler);
                  resolve(undefined);
                };

                provider?.on("connect", handler);
                provider?.on("disconnect", handler);
              });

              if (!provider.getSession()) {
                return [];
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

          if (!session) return [];

          try {
            return await getAccounts();
          }
          catch {
            return [];
          }
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
