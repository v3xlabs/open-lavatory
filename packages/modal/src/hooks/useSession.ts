import { encodeConnectionURL } from "@openlv/core";
import type { Session, SessionStateObject } from "@openlv/session";
import { useEffect, useState } from "preact/hooks";

import { log } from "../utils/log.js";
import { useEventEmitter } from "./useEventEmitter.js";
import { useProvider } from "./useProvider.js";
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

  useEffect(() => {
    const onStatusChange = () => {
      const session = provider?.getSession();

      if (session) {
        setSession(session);
      }
    };

    provider?.on("status_change", onStatusChange);

    const currentSession = provider?.getSession();

    if (currentSession) {
      setSession(currentSession);
    }

    return () => {
      provider?.off("status_change", onStatusChange);
    };
  }, [provider]);

  useEffect(() => {
    const onSessionStart = (_session: Session) => {
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
      const s = p ? settings?.signaling?.s?.[p] : undefined;

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
