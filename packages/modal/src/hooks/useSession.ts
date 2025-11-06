import { encodeConnectionURL } from "@openlv/core";
import type { Session, SessionStateObject } from "@openlv/session";
import { useEffect, useState } from "preact/hooks";

import { log } from "../utils/log.js";
import { useEventEmitter } from "./useEventEmitter";
import { useProvider } from "./useProvider";
import { useSettings } from "./useSettings.js";

export const useSession = () => {
  const { provider } = useProvider();
  const [session, setSession] = useState<Session | undefined>(
    provider?.getSession(),
  );
  const parameters = session?.getHandshakeParameters();
  const uri = parameters ? encodeConnectionURL(parameters) : undefined;
  const [status, setStatus] = useState<SessionStateObject | undefined>(
    session?.getState(),
  );

  useEventEmitter(session?.emitter, "state_change", (event) => {
    log("session state change: ", event);
    setStatus(event);
  });
  useEventEmitter(provider?.emitter, "session_started", (session) => {
    log("session started: ", session);
    setSession(session);
    setStatus(session.getState());
  });

  useEffect(() => {
    if (session) {
      setStatus(session.getState());
    }
  }, [session]);

  return {
    uri,
    status,
  };
};

export const useSessionStart = () => {
  const { provider } = useProvider();
  const { settings } = useSettings();

  return {
    start: () => {
      provider?.createSession(settings?.session);
    },
  };
};
