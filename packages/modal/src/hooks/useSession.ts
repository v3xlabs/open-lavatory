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

  useEventEmitter(provider, "status_change", () => {
    const session = provider?.getSession();

    if (session) {
      setSession(session);
    }
  });

  useEffect(() => {
    const onSessionStart = (_session: Session) => {
      log("session started: ", _session);

      setSession(_session);
      setStatus(_session.getState());
    };

    provider?.on("session_started", onSessionStart);

    return () => {
      provider?.off("session_started", onSessionStart);
    };
  }, [provider]);

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
      const p = settings?.signaling?.p;
      const s = settings?.signaling?.s[p];

      if (!p || !s) {
        throw new Error("Invalid protocol or server");
      }

      return provider?.createSession({
        p,
        s,
      });
    },
  };
};
