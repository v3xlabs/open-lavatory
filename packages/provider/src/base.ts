import { encodeConnectionURL, SessionLinkParameters } from "@openlv/core";
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

import type { ProviderEvents } from "./events";
import type { RpcSchema } from "./rpc";
import {
  createProviderStorage,
  type ProviderStorageParameters,
  type ProviderStorageR,
} from "./storage/index";
import { log } from "./utils/log";

export type OpenLVProviderParameters = Prettify<
  {
    config?: object;
  } & Pick<ProviderStorageParameters, "storage">
>;

export type ProviderStatus =
  | "disconnected"
  | "creating"
  | "connecting"
  | "connected"
  | "transport-reconnecting"
  | "error";

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
  let status: ProviderStatus = "disconnected";
  const chainId: string = "1";
  let accounts: Address[] = [];
  let sessionStateListener: ((state?: SessionStateObject) => void) | undefined;
  const storage = createProviderStorage({ storage: _parameters.storage });

  const updateStatus = (newStatus: ProviderStatus) => {
    status = newStatus;
    log("updateStatus", status);
    oxEmitter.emit("status_change", newStatus);
  };

  const detachSessionStateListener = () => {
    if (session && sessionStateListener) {
      session.emitter.off("state_change", sessionStateListener);
      sessionStateListener = undefined;
    }
  };

  const attachSessionStateListener = (target: Session) => {
    sessionStateListener = (state) => {
      if (!state) return;

      if (state.status === "transport-reconnecting") {
        updateStatus("transport-reconnecting");

        return;
      }

      if (state.status === "connected") {
        updateStatus("connected");

        return;
      }

      if (state.status === "disconnected") {
        updateStatus("disconnected");
      }
    };

    target.emitter.on("state_change", sessionStateListener);
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
    parameters: SessionLinkParameters = { p: "ntfy", s: "https://ntfy.sh/" },
  ) => {
    updateStatus("creating");
    const createdSession = await createSession(
      parameters,
      await dynamicSignalingLayer(parameters.p),
      onMessage,
    );

    detachSessionStateListener();
    session = createdSession;
    attachSessionStateListener(createdSession);
    updateStatus("connecting");

    log("session created");
    await createdSession.connect();
    log("session connected");
    const handshakeParameters = createdSession.getHandshakeParameters();
    const url = encodeConnectionURL(handshakeParameters);

    log("session url", url);
    oxEmitter.emit("session_started", createdSession);

    await createdSession.waitForLink();
    log("session linked");

    accounts = await getAccounts();

    updateStatus("connected");
    oxEmitter.emit("connect", { chainId });
    oxEmitter.emit("accountsChanged", accounts);

    return createdSession;
  };
  const closeSession = async () => {
    detachSessionStateListener();
    accounts = [];
    await session?.close();
    session = undefined;
    updateStatus("disconnected");
  };

  const request: OxProvider.from.Value<ProviderConfig>["request"] = async (
    request,
  ) => {
    log("ox request", request.method, request.params);

    return (
      match(request)
        .with({ method: "eth_chainId" }, () => {
          log("eth_chainId");

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
        // TODO: if modal is enabled explicitly toggle the modal to show.
        .with({ method: "eth_requestAccounts" }, async () => {
          log("eth_requestAccounts");

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

  return oxProvider;
};
