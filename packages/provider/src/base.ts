/* eslint-disable unicorn/consistent-function-scoping */
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

const DEFAULT_SESSION_LINK_PARAMETERS: SessionLinkParameters = {
  p: "mqtt",
  s: "wss://mqtt-dashboard.com:8884/mqtt",
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
  let status: ProviderStatus = PROVIDER_STATUS.STANDBY;
  let accounts: Address[] = [];
  const storage = createProviderStorage({ storage: parameters.storage });
  const { openModal, config } = parameters;

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
    parameters: SessionLinkParameters = DEFAULT_SESSION_LINK_PARAMETERS,
  ) => {
    updateStatus(PROVIDER_STATUS.CREATING);
    const transportOptions
      = convertTempV1(storage.getSettings().transport?.s?.webrtc)
        || config?.transport?.s?.webrtc;

    session = await createSession(
      parameters,
      await dynamicSignalingLayer(parameters.p),
      webrtc(transportOptions),
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

    const chainIdHex = (await session.send({
      method: "eth_chainId",
      params: [],
    })) as string;

    updateStatus(PROVIDER_STATUS.CONNECTED);
    oxEmitter.emit("connect", { chainId: chainIdHex });
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
