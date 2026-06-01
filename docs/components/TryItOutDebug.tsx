"use client";

import {
  type Session,
  SESSION_STATE,
  type SessionStateObject,
} from "@openlv/session";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAccount } from "wagmi";

export type TryItRole = "dapp" | "wallet";

export type ConnectionPhase =
  | "idle"
  | "establishing"
  | "linked"
  | "connected"
  | "error";

export type DappPeerInfo = {
  name?: string;
  url?: string;
  icon?: string;
};

export type TryItPeerInfo = {
  role: TryItRole;
  connectionUrl?: string;
  sessionId?: string;
  protocol?: string;
  signalingServer?: string;
  dapp?: DappPeerInfo;
};

export type TryItLogEntry = {
  logId: string;
  at: number;
  role: TryItRole;
  direction: "in" | "out";
  kind: "rpc" | "session" | "info";
  method?: string;
  summary: string;
  payload?: unknown;
};

type TryItDebugActions = {
  appendEntry: (entry: Omit<TryItLogEntry, "logId" | "at">) => void;
  appendInfo: (role: TryItRole, summary: string, payload?: unknown) => void;
  setPhase: (phase: ConnectionPhase) => void;
  setPeer: (peer: TryItPeerInfo | null) => void;
  clearLog: () => void;
  resetDebug: () => void;
};

type TryItDebugState = {
  phase: ConnectionPhase;
  peer: TryItPeerInfo | null;
  entries: TryItLogEntry[];
};

type TryItDebugContextValue = TryItDebugState & TryItDebugActions;

const TryItDebugActionsContext = createContext<TryItDebugActions | null>(null);
const TryItDebugStateContext = createContext<TryItDebugState | null>(null);

const MAX_LOG_ENTRIES = 200;

const nextLogId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36)
    .slice(2, 8)}`;

const sessionStatusLabel = (status: SessionStateObject["status"]) => {
  switch (status) {
    case SESSION_STATE.CREATED: {
      return "created";
    }
    case SESSION_STATE.SIGNALING: {
      return "signaling";
    }
    case SESSION_STATE.READY: {
      return "ready";
    }
    case SESSION_STATE.LINKING: {
      return "linking";
    }
    case SESSION_STATE.CONNECTED: {
      return "connected";
    }
    case SESSION_STATE.DISCONNECTED: {
      return "disconnected";
    }
    default: {
      return status;
    }
  }
};

const sessionToPhase = (
  status: SessionStateObject["status"],
): ConnectionPhase => {
  if (status === SESSION_STATE.CONNECTED) return "connected";

  if (status === SESSION_STATE.DISCONNECTED) return "error";

  if (
    status === SESSION_STATE.SIGNALING
    || status === SESSION_STATE.READY
    || status === SESSION_STATE.LINKING
    || status === SESSION_STATE.CREATED
  ) {
    return "establishing";
  }

  return "idle";
};

const formatPayload = (payload: unknown) => {
  try {
    return JSON.stringify(payload, null, 2);
  }
  catch {
    return String(payload);
  }
};

export const TryItDebugProvider = ({ children }: { children: ReactNode; }) => {
  const [phase, setPhase] = useState<ConnectionPhase>("idle");
  const [peer, setPeer] = useState<TryItPeerInfo | null>(null);
  const [entries, setEntries] = useState<TryItLogEntry[]>([]);

  const appendEntry = useCallback(
    (entry: Omit<TryItLogEntry, "logId" | "at">) => {
      setEntries(prev => [
        {
          ...entry,
          logId: nextLogId(),
          at: Date.now(),
        },
        ...prev,
      ].slice(0, MAX_LOG_ENTRIES));
    },
    [],
  );

  const appendInfo = useCallback(
    (role: TryItRole, summary: string, payload?: unknown) => {
      appendEntry({
        role,
        direction: "in",
        kind: "info",
        summary,
        payload,
      });
    },
    [appendEntry],
  );

  const clearLog = useCallback(() => {
    setEntries([]);
  }, []);

  const resetDebug = useCallback(() => {
    setPhase("idle");
    setPeer(null);
    setEntries([]);
  }, []);

  const actions = useMemo(
    () => ({
      appendEntry,
      appendInfo,
      setPhase,
      setPeer,
      clearLog,
      resetDebug,
    }),
    [appendEntry, appendInfo, clearLog, resetDebug],
  );

  const state = useMemo(
    () => ({ phase, peer, entries }),
    [phase, peer, entries],
  );

  return (
    <TryItDebugActionsContext.Provider value={actions}>
      <TryItDebugStateContext.Provider value={state}>
        {children}
      </TryItDebugStateContext.Provider>
    </TryItDebugActionsContext.Provider>
  );
};

export const useTryItDebugActions = (): TryItDebugActions => {
  const ctx = useContext(TryItDebugActionsContext);

  if (!ctx) {
    throw new Error(
      "useTryItDebugActions must be used within TryItDebugProvider",
    );
  }

  return ctx;
};

export const useTryItDebug = (): TryItDebugContextValue => {
  const actions = useTryItDebugActions();
  const state = useContext(TryItDebugStateContext);

  if (!state) {
    throw new Error("useTryItDebug must be used within TryItDebugProvider");
  }

  return { ...state, ...actions };
};

export const attachTryItSession = (
  session: Session,
  role: TryItRole,
  debug: TryItDebugActions,
  options?: { logRequests?: boolean; },
) => {
  let lastSessionLogKey = "";

  const logSessionState = (state?: SessionStateObject) => {
    if (!state) return;

    debug.setPhase(sessionToPhase(state.status));

    const signaling = state.signaling?.state;
    const logKey = `${state.status}:${signaling ?? ""}`;

    if (logKey === lastSessionLogKey) return;

    lastSessionLogKey = logKey;

    debug.appendEntry({
      role,
      direction: "in",
      kind: "session",
      summary: signaling
        ? `Session ${sessionStatusLabel(state.status)} · signaling ${signaling}`
        : `Session ${sessionStatusLabel(state.status)}`,
      payload: state,
    });

    if (state.status === SESSION_STATE.CONNECTED) {
      debug.appendInfo(role, "Connection established — WebRTC channel open");
    }
  };

  const onState = (state?: SessionStateObject) => logSessionState(state);
  const onRequest = (payload: object | string) => {
    const req = payload as { method?: string; };

    debug.appendEntry({
      role,
      direction: "in",
      kind: "rpc",
      method: req.method,
      summary: req.method
        ? `← ${req.method}`
        : "← request (no method)",
      payload,
    });
  };

  session.emitter.on("state_change", onState);

  if (options?.logRequests !== false) {
    session.emitter.on("request", onRequest);
  }

  logSessionState(session.getState());

  return () => {
    session.emitter.off("state_change", onState);

    if (options?.logRequests !== false) {
      session.emitter.off("request", onRequest);
    }
  };
};

export const shimWalletOnMessage = (
  role: TryItRole,
  handler: (message: object) => Promise<object | string>,
  debug: TryItDebugActions,
) => async (message: object) => {
  const req = message as { method?: string; };

  debug.appendEntry({
    role,
    direction: "in",
    kind: "rpc",
    method: req.method,
    summary: req.method ? `← ${req.method}` : "← request",
    payload: message,
  });

  try {
    const response = await handler(message);

    debug.appendEntry({
      role,
      direction: "out",
      kind: "rpc",
      method: req.method,
      summary: req.method ? `→ ${req.method}` : "→ response",
      payload: response,
    });

    return response;
  }
  catch (error) {
    debug.appendEntry({
      role,
      direction: "out",
      kind: "rpc",
      method: req.method,
      summary: req.method ? `→ ${req.method} (error)` : "→ error",
      payload:
                error instanceof Error
                  ? { message: error.message }
                  : error,
    });
    throw error;
  }
};

export const peerInfoFromConnectionUrl = (
  role: TryItRole,
  connectionUrl: string,
): TryItPeerInfo => {
  try {
    const parsed = new URL(connectionUrl);

    return {
      role,
      connectionUrl,
      sessionId: parsed.username || undefined,
      protocol: parsed.searchParams.get("p") ?? undefined,
      signalingServer: parsed.searchParams.get("s") ?? undefined,
    };
  }
  catch {
    return { role, connectionUrl };
  }
};

export type DappProviderShim = {
  getSession: () => Session | undefined;
  on: (
    event: "session_started",
    handler: (session: Session) => void,
  ) => void;
  off: (
    event: "session_started",
    handler: (session: Session) => void,
  ) => void;
  request: (args: JsonRpcCall) => Promise<unknown>;
};

export type JsonRpcCall = {
  method: string;
  params?: unknown;
};

const phaseLabel: Record<ConnectionPhase, string> = {
  idle: "Not connected",
  establishing: "Establishing connection",
  linked: "Opening WebRTC",
  connected: "Connected",
  error: "Connection failed",
};

const phaseDotClass: Record<ConnectionPhase, string> = {
  idle: "bg-[var(--vocs-color_textSecondary)]",
  establishing: "bg-[var(--vocs-color_textSecondary)] animate-pulse",
  linked: "bg-[var(--vocs-color_textSecondary)] animate-pulse",
  connected: "bg-[var(--vocs-color_text)]",
  error: "bg-[var(--vocs-color_textSecondary)]",
};

const StatusDot = ({ phase }: { phase: ConnectionPhase; }) => (
  <span
    className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${phaseDotClass[phase]}`}
    aria-hidden
  />
);

const peerMetaLine = (peer: TryItPeerInfo) => {
  const parts: string[] = [];

  if (peer.sessionId) parts.push(peer.sessionId);

  if (peer.protocol) parts.push(peer.protocol);

  if (peer.dapp?.name) parts.push(peer.dapp.name);

  return parts.join(" · ");
};

export const ConnectionStatusBar = () => {
  const { phase, peer } = useTryItDebug();
  const [copied, setCopied] = useState(false);

  if (phase === "idle" && !peer) return null;

  const meta = peer ? peerMetaLine(peer) : "";
  const connectionUrl
        = peer?.role === "dapp" ? peer.connectionUrl : undefined;

  const copyConnectionUrl = async () => {
    if (!connectionUrl) return;

    await navigator.clipboard.writeText(connectionUrl);
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-3 rounded-lg border vocs:border-primary bg-[var(--vocs-color_codeBlockBackground)] px-3 py-2.5">
      <StatusDot phase={phase} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
          <span className="font-medium text-[var(--vocs-color_text)]">
            {phaseLabel[phase]}
          </span>
          {peer && (
            <span className="text-xs text-[var(--vocs-color_textSecondary)]">
              {peer.role === "dapp" ? "dApp" : "Wallet"}
            </span>
          )}
        </div>
        {meta && (
          <p
            className="mt-0.5 truncate font-mono text-xs text-[var(--vocs-color_textSecondary)]"
            title={peer?.connectionUrl}
          >
            {meta}
          </p>
        )}
        {connectionUrl && (
          <div className="mt-1.5 flex items-center gap-2">
            <p
              className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--vocs-color_textSecondary)]"
              title={connectionUrl}
            >
              {connectionUrl}
            </p>
            <button
              type="button"
              onClick={() => copyConnectionUrl()}
              className="shrink-0 rounded-md border vocs:border-primary px-2 py-0.5 text-xs hover:bg-[var(--vocs-color_codeHighlightBackground)]"
            >
              {copied ? "Copied" : "Copy URL"}
            </button>
          </div>
        )}
        {peer?.dapp?.url && (
          <p className="mt-0.5 truncate text-xs text-[var(--vocs-color_textSecondary)]">
            {peer.dapp.url}
          </p>
        )}
      </div>
    </div>
  );
};

const LogRow = ({
  entry,
  expanded,
  onToggle,
}: {
  entry: TryItLogEntry;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const hasPayload = entry.payload !== undefined;
  const time = new Date(entry.at).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="text-xs">
      <button
        type="button"
        disabled={!hasPayload}
        onClick={onToggle}
        className={[
          "flex w-full items-baseline gap-2 px-3 py-2 text-left transition-colors",
          hasPayload
            ? "hover:bg-[var(--vocs-color_codeHighlightBackground)]"
            : "cursor-default",
        ].join(" ")}
      >
        <time
          dateTime={new Date(entry.at).toISOString()}
          className="shrink-0 tabular-nums text-[var(--vocs-color_textSecondary)]"
        >
          {time}
        </time>
        <span className="shrink-0 uppercase tracking-wide text-[var(--vocs-color_textSecondary)]">
          {entry.role}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[var(--vocs-color_text)]">
          {entry.summary}
        </span>
        {hasPayload && (
          <span className="shrink-0 text-[var(--vocs-color_textSecondary)]">
            {expanded ? "−" : "+"}
          </span>
        )}
      </button>
      {expanded && hasPayload && (
        <pre className="border-t vocs:border-primary bg-[var(--vocs-color_codeTitleBackground)] px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all text-[var(--vocs-color_textSecondary)]">
          {formatPayload(entry.payload)}
        </pre>
      )}
    </div>
  );
};

export const MessageLogPanel = () => {
  const listId = useId();
  const { entries, clearLog } = useTryItDebug();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (entries.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border vocs:border-primary">
      <div className="flex items-center gap-2 bg-[var(--vocs-color_codeBlockBackground)] px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-[var(--vocs-color_text)]"
        >
          <span
            className="text-[var(--vocs-color_textSecondary)] transition-transform"
            style={{
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
            }}
            aria-hidden
          >
            ›
          </span>
          <span className="font-medium">Wire log</span>
          <span className="rounded-full border vocs:border-primary px-2 py-0.5 font-mono text-xs tabular-nums text-[var(--vocs-color_textSecondary)]">
            {entries.length}
          </span>
        </button>
        {open && (
          <button
            type="button"
            onClick={clearLog}
            className="shrink-0 rounded-md px-2 py-0.5 text-xs text-[var(--vocs-color_textSecondary)] hover:bg-[var(--vocs-color_codeHighlightBackground)] hover:text-[var(--vocs-color_text)]"
          >
            Clear
          </button>
        )}
      </div>
      {open && (
        <ul
          id={listId}
          className="max-h-72 overflow-y-auto border-t vocs:border-primary bg-[var(--vocs-color_codeTitleBackground)]"
        >
          {entries.map((entry, index) => (
            <li
              key={entry.logId}
              className={
                index < entries.length - 1
                  ? "border-b vocs:border-primary"
                  : undefined
              }
            >
              <LogRow
                entry={entry}
                expanded={expandedId === entry.logId}
                onToggle={() =>
                  setExpandedId(current =>
                    (current === entry.logId
                      ? null
                      : entry.logId),
                  )}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Connection status + collapsible wire log, shown when a session is active. */
export const TryItSessionPanel = () => {
  const { phase, peer, entries } = useTryItDebug();
  const visible
        = phase !== "idle" || peer !== null || entries.length > 0;

  if (!visible) return null;

  return (
    <div className="flex flex-col gap-2">
      <ConnectionStatusBar />
      <MessageLogPanel />
    </div>
  );
};

/** Observes the OpenLV dApp provider and logs JSON-RPC + session events. */
export const OpenLvDappMonitor = ({
  onSessionBound,
}: {
  onSessionBound?: (session: Session) => void;
}) => {
  const { connector, isConnected } = useAccount();
  const debug = useTryItDebugActions();
  const onSessionBoundRef = useRef(onSessionBound);

  onSessionBoundRef.current = onSessionBound;
  const detachRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (!isConnected || connector?.type !== "openLv") {
      detachRef.current?.();
      detachRef.current = undefined;

      return;
    }

    let cancelled = false;
    let restoreRequest: DappProviderShim["request"] | undefined;

    const wire = async () => {
      const provider = (await connector.getProvider()) as DappProviderShim;

      if (cancelled) return;

      const bindSession = (activeSession: Session) => {
        detachRef.current?.();
        detachRef.current = attachTryItSession(
          activeSession,
          "dapp",
          debug,
          { logRequests: true },
        );

        onSessionBoundRef.current?.(activeSession);
        debug.appendInfo(
          "dapp",
          "Session started — copy the connection URL for the wallet tab",
        );
      };

      const onSessionStarted = (activeSession: Session) => {
        debug.setPhase("establishing");
        bindSession(activeSession);
      };

      provider.on("session_started", onSessionStarted);

      const existing = provider.getSession();

      if (existing) bindSession(existing);

      restoreRequest = provider.request.bind(provider);
      provider.request = async (args: JsonRpcCall) => {
        debug.appendEntry({
          role: "dapp",
          direction: "out",
          kind: "rpc",
          method: args.method,
          summary: `→ ${args.method}`,
          payload: args,
        });

        try {
          const result = await restoreRequest!(args);

          debug.appendEntry({
            role: "dapp",
            direction: "in",
            kind: "rpc",
            method: args.method,
            summary: `← ${args.method}`,
            payload: result,
          });

          return result;
        }
        catch (error) {
          debug.appendEntry({
            role: "dapp",
            direction: "in",
            kind: "rpc",
            method: args.method,
            summary: `← ${args.method} (error)`,
            payload:
                            error instanceof Error
                              ? { message: error.message }
                              : error,
          });
          throw error;
        }
      };

      return () => {
        provider.off("session_started", onSessionStarted);

        if (restoreRequest) {
          provider.request = restoreRequest;
        }
      };
    };

    let unwireProvider: (() => void) | undefined;

    wire().then((unwire) => {
      unwireProvider = unwire;
    });

    return () => {
      cancelled = true;
      unwireProvider?.();
      detachRef.current?.();
      detachRef.current = undefined;
    };
  }, [isConnected, connector, debug]);

  return null;
};

export type { TryItDebugActions };
