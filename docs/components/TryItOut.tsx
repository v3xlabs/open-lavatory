"use client";

/* eslint-disable no-restricted-syntax */
import { openlv } from "@openlv/connector";
import { encodeConnectionURL } from "@openlv/core";
import { connectSession, type Session } from "@openlv/session";
import { webrtc } from "@openlv/transport/webrtc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import classNames from "classnames";
import { useRef, useState } from "react";
import { match } from "ts-pattern";
import { type Address, type EIP1193Provider } from "viem";
import {
  type Connector,
  createConfig,
  http,
  useAccount,
  useChainId,
  useClient,
  useConnect,
  useConnections,
  useDisconnect,
  useSignMessage,
  useVerifyMessage,
  WagmiProvider,
} from "wagmi";
import { holesky, mainnet, sepolia } from "wagmi/chains";

import {
  attachTryItSession,
  OpenLvDappMonitor,
  peerInfoFromConnectionUrl,
  shimWalletOnMessage,
  TryItDebugProvider,
  TryItSessionPanel,
  useTryItDebug,
} from "./TryItOutDebug.js";

const queryClient = new QueryClient();

const config = createConfig({
  chains: [mainnet, sepolia, holesky],
  connectors: [openlv()],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [holesky.id]: http(),
  },
});

const trimAddress = (address: Address | undefined | null) => {
  if (!(typeof address === "string")) return address;

  return `${address.slice(0, 5)}...${address.slice(-4)}`;
};

const TestSign = () => {
  const {
    signMessage,
    data: signedData,
    error,
    isPending,
    reset: resetSignature,
  } = useSignMessage();
  const { address, connector } = useAccount();
  const chainId = useChainId();
  const { phase } = useTryItDebug();
  const sessionReady
    = connector?.type !== "openLv" || phase === "connected";

  const {
    data: verificationResult,
    error: verificationError,
    isLoading: isVerifying,
  } = useVerifyMessage({
    address,
    message: "Hello, world!",
    signature: signedData,
    chainId,
  });

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          <div>Test a personal sign</div>
        </div>
        <button
          type="button"
          disabled={!sessionReady || isPending}
          onClick={() => {
            resetSignature();
            signMessage({ message: "Hello, world!" });
          }}
          className="!bg-[var(--vocs-color_codeTitleBackground)] hover:!bg-[var(--vocs-color_codeBlockBackground)] rounded-lg vocs:border-primary px-4 py-1 disabled:opacity-50"
        >
          Sign Message
        </button>
      </div>
      {connector?.type === "openLv" && !sessionReady && (
        <p className="text-[var(--vocs-color_textSecondary)] text-sm">
          Finish linking in the wallet tab (status must be Connected) before
          signing.
        </p>
      )}
      {connector?.type === "openLv" && sessionReady && (
        <p className="text-[var(--vocs-color_textSecondary)] text-sm">
          Sends
          {" "}
          <code className="text-xs">personal_sign</code>
          {" "}
          through OpenLV to your browser wallet in the other tab.
        </p>
      )}
      {isPending && (
        <div className="rounded-md vocs:border-primary vocs:bg-primary p-2 text-[var(--vocs-color_text)] text-sm">
          Waiting for signature… (check your wallet)
        </div>
      )}
      {error && (
        <div className="rounded-md vocs:border-primary vocs:bg-primary p-2 text-[var(--vocs-color_text)] text-sm">
          Signature request cancelled or failed
        </div>
      )}
      {signedData && (
        <div className="space-y-2">
          {isVerifying
            ? (
                <div className="rounded-md border border-[var(--vocs-color_codeInlineBorder)] bg-[var(--vocs-color_codeBlockBackground)] p-2 text-[var(--vocs-color_text)] text-sm">
                  Verifying signature...
                </div>
              )
            : (verificationResult === undefined
                ? null
                : (
                    <div
                      className={`rounded-md border border-[var(--vocs-color_codeInlineBorder)] bg-[var(--vocs-color_codeBlockBackground)] p-2 text-sm ${verificationResult
                        ? "text-green-500"
                        : "text-[var(--vocs-color_text)]"
                      }`}
                    >
                      {verificationResult ? "Valid signature" : "Invalid signature"}
                    </div>
                  ))}
          {verificationError && (
            <div className="rounded-md border border-[var(--vocs-color_codeInlineBorder)] bg-[var(--vocs-color_codeBlockBackground)] p-2 text-[var(--vocs-color_text)] text-sm">
              Error:
              {" "}
              {verificationError instanceof Error
                ? verificationError.message
                : String(verificationError)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ConnectComponent = () => {
  const walletClient = useClient();
  const connections = useConnections();
  const [url, setUrl] = useState<string | undefined>();
  const [connecting, setConnecting] = useState(false);
  const [walletSessionActive, setWalletSessionActive] = useState(false);
  const debug = useTryItDebug();
  const walletSessionRef = useRef<Session | undefined>(undefined);
  const detachSessionRef = useRef<(() => void) | undefined>(undefined);

  if (!walletClient) return <div>No wallet client found</div>;

  const disconnectWalletSession = async () => {
    detachSessionRef.current?.();
    detachSessionRef.current = undefined;
    await walletSessionRef.current?.close();
    walletSessionRef.current = undefined;
    setWalletSessionActive(false);
    debug.resetDebug();
  };

  return (
    <div className="space-y-1 vocs:border-primary border-b pb-2">
      <div>
        Connect as the wallet by pasting the dApp connection URL from the other
        tab, then approve requests in your browser wallet.
      </div>
      <div className="flex items-center gap-2">
        <div className="grow">
          <input
            type="text"
            value={url}
            className="!bg-[var(--vocs-color_codeTitleBackground)] hover:!bg-[var(--vocs-color_codeBlockBackground)] block w-full grow rounded-lg border vocs:border-primary px-4 py-1 placeholder:text-neutral-500"
            onChange={e => setUrl(e.target.value)}
            placeholder="openlv://..."
            disabled={connecting}
          />
        </div>
        <button
          type="button"
          disabled={connecting || !url}
          onClick={async () => {
            if (!url) return;

            setConnecting(true);
            await disconnectWalletSession();

            debug.setPhase("establishing");
            debug.setPeer(peerInfoFromConnectionUrl("wallet", url));
            debug.appendInfo("wallet", "Connecting to dApp session…", { url });

            try {
              const client
                = (await connections[0]?.connector?.getProvider()) as EIP1193Provider;

              const activeSession = await connectSession(
                url,
                shimWalletOnMessage(
                  "wallet",
                  async message =>
                  // const { method } = message as { method: string; };

                    client.request(message as never), // if (method === "eth_accounts") {
                  //   return client.request({
                  //     method: "eth_accounts",
                  //     params: [] as never,
                  //   });
                  // }

                  // if (method === "eth_chainId") {
                  //   return client.request({
                  //     method: "eth_chainId",
                  //     params: [] as never,
                  //   });
                  // }

                  // if (method === "personal_sign") {
                  //   return client.request(message as never);
                  // }

                  // return {
                  //   error: {
                  //     code: -32601,
                  //     message: "Method not found",
                  //   },
                  // };

                  debug,
                ),
                webrtc(),
              );

              walletSessionRef.current = activeSession;
              detachSessionRef.current = attachTryItSession(
                activeSession,
                "wallet",
                debug,
                { logRequests: false },
              );

              setWalletSessionActive(true);

              await activeSession.connect();
              debug.setPhase("linked");
              debug.appendInfo(
                "wallet",
                "Signaling handshake complete — waiting for WebRTC",
              );

              await activeSession.waitForLink();
              debug.setPhase("connected");
            }
            catch (error) {
              debug.setPhase("error");
              debug.appendInfo(
                "wallet",
                "Connection failed",
                error instanceof Error
                  ? { message: error.message }
                  : error,
              );
            }
            finally {
              setConnecting(false);
            }
          }}
          className="!bg-[var(--vocs-color_codeTitleBackground)] hover:!bg-[var(--vocs-color_codeBlockBackground)] rounded-lg border vocs:border-primary px-4 py-1 disabled:opacity-50"
        >
          {connecting ? "Connecting…" : "Connect"}
        </button>
        {walletSessionActive && (
          <button
            type="button"
            onClick={() => disconnectWalletSession()}
            className="rounded-lg border vocs:border-primary px-3 py-1 text-sm"
          >
            End session
          </button>
        )}
      </div>
    </div>
  );
};

const Connected = () => {
  const { disconnect } = useDisconnect();
  const { address, connector } = useAccount();
  const debug = useTryItDebug();

  return (
    <div className="rounded-lg vocs:border-primary bg-[var(--vocs-color_codeBlockBackground)] px-4 py-4">
      <div className="mb-2 flex items-center justify-between gap-2 vocs:border-primary border-b pb-2">
        <div className="flex items-center gap-2">
          {connector?.icon && (
            <img
              src={connector.icon}
              alt={`${connector.name} icon`}
              className="h-10 w-10 rounded-md"
            />
          )}
          <div>
            Connected to
            {" "}
            {trimAddress(address)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            debug.resetDebug();
            disconnect();
          }}
          className="!bg-[var(--vocs-color_codeTitleBackground)] hover:!bg-[var(--vocs-color_codeBlockBackground)] rounded-lg vocs:border-primary px-4 py-1"
        >
          Disconnect
        </button>
      </div>
      <div className="space-y-3">
        <TryItSessionPanel />
        {connector?.type !== "openLv" && <ConnectComponent />}
        {connector?.type === "openLv" && (
          <p className="text-[var(--vocs-color_textSecondary)] text-sm">
            dApp mode — connect a wallet in the other tab and paste your
            connection URL there. Expand Wire log to trace JSON-RPC both ways.
          </p>
        )}
        <TestSign />
      </div>
    </div>
  );
};

const ConnectorPreview = ({ connector }: { connector: Connector; }) => {
  const { connect } = useConnect();

  return (
    <button
      type="button"
      className="hover:!bg-[var(--vocs-color_codeHighlightBackground)] inline-flex translate-y-0.5 items-center gap-2 rounded-lg border vocs:border-primary px-2 py-0.5"
      onClick={() => {
        connect({ connector });
      }}
    >
      {connector.icon && (
        <img
          src={connector.icon}
          alt={`${connector.name} icon`}
          className="h-4 w-4 rounded-md"
        />
      )}
      <span>{connector.name}</span>
    </button>
  );
};

const Connectors = () => {
  const { connect, connectors } = useConnect();

  const openLvConnector = connectors.find(
    connector => connector.type === "openLv",
  );
  const firstNonOpenLvConnector = connectors.find(
    connector => connector.type !== "openLv",
  );

  return (
    <>
      <div className="mt-4 space-y-2 p-2">
        <ul className="mx-auto w-full max-w-xs space-y-2">
          {connectors.map(connector => (
            <li key={connector.id}>
              <button
                type="button"
                onClick={() => {
                  connect({ connector });
                }}
                className={classNames(
                  "!bg-[var(--vocs-color_codeBlockBackground)] flex w-full items-center justify-between rounded-lg px-4 py-2 text-sm",
                  connector.type === "openLv"
                    ? "hover:!bg-[var(--vocs-color_backgroundAccent)]/10 border vocs:border-primary"
                    : "hover:!bg-[var(--vocs-color_codeHighlightBackground)]",
                )}
              >
                <span
                  className={classNames(
                    "font-bold text-sm",
                    connector.type === "openLv"
                    && "text-[var(--vocs-color_codeInlineText)]",
                  )}
                >
                  {connector.name}
                </span>
                {connector.icon && (
                  <img
                    src={connector.icon}
                    alt={`${connector.name} icon`}
                    className="h-10 w-10 rounded-md"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="w-full rounded-b-md vocs:border-primary border-t bg-[var(--vocs-color_codeBlockBackground)] px-4 py-2">
        <div>
          The above is a sample wagmi snippet. You can use it to test OpenLV
          right here.
          <br />
          <div>
            <div>Steps:</div>
            <ul className="list-inside list-disc">
              <li>
                Open this page in
                {" "}
                <span className="font-bold">a new tab</span>
              </li>
              <li>
                Click
                {openLvConnector && (
                  <ConnectorPreview connector={openLvConnector} />
                )}
                {" "}
                on one tab and
                {" "}
                {firstNonOpenLvConnector
                  ? (
                      <ConnectorPreview connector={firstNonOpenLvConnector} />
                    )
                  : (
                      <span className="font-bold">your wallet</span>
                    )}
                {" "}
                on the other
              </li>
              <li>Copy the connection URL from the dApp tab</li>
              <li>Paste it on the wallet tab and connect</li>
              <li>Expand the message log to inspect JSON-RPC in both directions</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

const Inner = () => {
  const { isConnected } = useAccount();
  const debug = useTryItDebug();

  return (
    <div className="space-y-2">
      <OpenLvDappMonitor
        onSessionBound={(activeSession) => {
          const handshake = activeSession.getHandshakeParameters();
          const connectionUrl = encodeConnectionURL(handshake);

          debug.setPeer({
            role: "dapp",
            connectionUrl,
            sessionId: handshake.sessionId,
            protocol: handshake.p,
            signalingServer: handshake.s,
          });
          debug.appendInfo("dapp", "Connection URL ready", { connectionUrl });
        }}
      />
      {match(isConnected)
        .with(true, () => <Connected />)
        .with(false, () => <Connectors />)
        .exhaustive()}
    </div>
  );
};

export const Outter = () => (
  <QueryClientProvider client={queryClient}>
    <WagmiProvider config={config}>
      <TryItDebugProvider>
        <Inner />
      </TryItDebugProvider>
    </WagmiProvider>
  </QueryClientProvider>
);

export const TryItOut = () => {
  const inBrowser = globalThis.window !== undefined;

  return (
    <div
      className="rounded-lg border vocs:border-primary"
      suppressHydrationWarning
    >
      {inBrowser && <Outter />}
    </div>
  );
};
