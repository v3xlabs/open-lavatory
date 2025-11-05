/* eslint-disable @typescript-eslint/no-unused-vars */
import type { SessionLinkParameters } from "@openlv/core";
import {
  createSession,
  type Session,
  type SessionStateObject,
} from "@openlv/session";
import { ntfy } from "@openlv/signaling/ntfy";
import EventEmitter from "eventemitter3";
import type {
  Address,
  EIP1193EventMap,
  EIP1193Provider,
  EIP1193RequestFn,
} from "viem";

import type { ProviderEvents } from "./events";
import { log } from "./utils/log";

export type OpenLVProviderParameters = {
  foo: "bar";
};

export type ProviderStatus =
  | "disconnected"
  | "creating"
  | "connecting"
  | "connected"
  | "error";

export type ProviderState = {
  status: ProviderStatus;
  session?: SessionStateObject;
};

// EIP1193Provider
export type OpenLVProvider = {
  emitter: EventEmitter<ProviderEvents & EIP1193EventMap>;
  createSession: (parameters?: SessionLinkParameters) => Promise<Session>;
  getSession: () => Session | undefined;
  getState: () => ProviderState;
  closeSession: () => Promise<void>;
  getAccounts: () => Promise<Address[]>;
} & EIP1193Provider;

export const createProvider = (
  _parameters: OpenLVProviderParameters,
): OpenLVProvider => {
  const emitter = new EventEmitter<ProviderEvents & EIP1193EventMap>();
  let session: Session | undefined;
  let status: ProviderStatus = "disconnected";
  const chainId: string = "1";
  let accounts: Address[] = [];

  const updateStatus = (newStatus: ProviderStatus) => {
    status = newStatus;
    emitter.emit("status_change", newStatus);
  };

  const onMessage = async (message: object) => {
    log("provider received message", message);

    return { result: "success" };
  };

  const request: EIP1193RequestFn = async (request) => {
    log("provider request", request);

    if (session) {
      return (await session.send(request)) as never;
    }

    throw new Error("No session");
  };

  const getAccounts = async () => {
    if (accounts.length > 0) {
      log("getAcc early return ", accounts);

      return accounts;
    }

    log("getAcc requesting accounts");
    accounts = (await request({
      method: "eth_accounts",
      params: [],
    })) as Address[];

    log("getAcc accounts found", accounts);

    return accounts as Address[];
  };

  const coreProvider: EIP1193Provider = {
    request,
    on(event, listener) {
      console.log("on", event, listener);

      // @ts-ignore
      emitter.on(event, listener);
    },
    removeListener(event, listener) {
      console.log("removeListener", event, listener);

      // @ts-ignore
      emitter.removeListener(event, listener);
    },
  };

  const provider: OpenLVProvider = Object.assign(coreProvider, {
    createSession: async (
      parameters: SessionLinkParameters = { p: "ntfy", s: "https://ntfy.sh/" },
    ) => {
      updateStatus("creating");
      session = await createSession(parameters, ntfy, onMessage);
      updateStatus("connecting");

      log("session created");
      await session.connect();
      log("session connected");
      emitter.emit("session_started", session);

      await session.waitForLink();
      log("session linked");

      accounts = await getAccounts();

      updateStatus("connected");
      emitter.emit("connect", { chainId });
      emitter.emit("accountsChanged", accounts);

      return session;
    },
    getSession: () => session,
    closeSession: async () => {
      await session?.close();
      session = undefined;
      updateStatus("disconnected");
    },
    getState: () => ({ status }),
    emitter,
    getAccounts,
    ...emitter,
  });

  return provider;
};
