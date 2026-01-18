/* eslint-disable no-restricted-syntax */
import "../styles.css";

import { openlv } from "@openlv/connector";
// import { simpleTheme } from "@openlv/modal/theme";
import { connectSession, type Session } from "@openlv/session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import classNames from "classnames";
import { useState } from "react";
import { match } from "ts-pattern";
import {
  type Address,
  createPublicClient,
  type EIP1193Provider,
  http as viemHttp,
} from "viem";
import {
  type Connector,
  createConfig,
  http,
  useAccount,
  useClient,
  useConnect,
  useConnections,
  useConnectorClient,
  useDisconnect,
  useSignMessage,
  WagmiProvider,
} from "wagmi";
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from "wagmi/chains";

const queryClient = new QueryClient();

const config = createConfig({
  chains: [mainnet, sepolia, arbitrum, optimism, polygon, base],
  connectors: [
    openlv({
      // theme: {
      //   theme: simpleTheme,
      //   mode: "light",
      // },
      theme: {
        // Either a predefined theme like such
        theme: "simple",
        // Or a custom theme:
        // theme: {
        //   dark: {
        //     body: {
        //       background: "orange",
        //       color: "red",
        //     },
        //   },
        //   light: {
        //     body: {
        //       background: "blue",
        //       color: "white",
        //     },
        //   },
        // },
        mode: "light",
      },
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
    [base.id]: http(),
  },
});

const trimAddress = (address: Address | undefined | null) => {
  if (!(typeof address === "string")) return address;

  return `${address.slice(0, 5)}...${address.slice(-4)}`;
};

let session: Session | undefined = undefined;

const TestSign = () => {
  const { signMessage, data: signedData, error, isPending } = useSignMessage();
  const { address, connector } = useAccount();

  const [verificationResult, setVerificationResult] = useState<boolean | null>(
    null,
  );
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );
  const [isVerifying, setIsVerifying] = useState(false);

  const verifySignature = async (signature: string) => {
    if (!signature || !address || !connector) return;

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const provider = (await connector.getProvider()) as EIP1193Provider;
      const chainIdHex = await provider.request({
        method: "eth_chainId",
        params: [] as never,
      });
      const chainId = parseInt(chainIdHex as string, 16);

      console.log("Remote wallet chainId:", chainId);

      const chainConfig = config.chains.find((c) => c.id === chainId);

      if (!chainConfig) {
        throw new Error(`Chain ${chainId} not configured`);
      }

      const publicClient = createPublicClient({
        chain: chainConfig,
        transport: viemHttp(),
      });

      console.log("Verifying signature with:", {
        address,
        message: "Hello, world!",
        signature: signature as `0x${string}`,
        chainId: publicClient.chain?.id,
      });

      const valid = await publicClient.verifyMessage({
        address,
        message: "Hello, world!",
        signature: signature as `0x${string}`,
      });

      console.log("Verification result:", valid);
      setVerificationResult(valid);
    } catch (error) {
      console.error("Verification failed:", error);

      setVerificationError(
        error instanceof Error ? error.message : String(error),
      );
      setVerificationResult(false);
    } finally {
      setIsVerifying(false);
    }
  };

  if (
    signedData &&
    typeof signedData === "string" &&
    signedData.startsWith("0x") &&
    !isVerifying &&
    verificationResult === null
  ) {
    verifySignature(signedData);
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          <div>Test a personal sign</div>
        </div>
        <button
          onClick={() => {
            signMessage({ message: "Hello, world!" });
            setVerificationResult(null);
            setVerificationError(null);
          }}
          className="!bg-[var(--vocs-color_codeTitleBackground)] hover:!bg-[var(--vocs-color_codeBlockBackground)] rounded-lg border border-[var(--vocs-color_codeInlineBorder)] px-4 py-1"
        >
          Sign Message
        </button>
      </div>
      {isPending && (
        <div className="rounded-md border border-[var(--vocs-color_codeInlineBorder)] bg-[var(--vocs-color_codeBlockBackground)] p-2 text-[var(--vocs-color_text)] text-sm">
          ⏳ Waiting for signature... (Check your wallet)
        </div>
      )}
      {error && (
        <div className="rounded-md border border-[var(--vocs-color_codeInlineBorder)] bg-[var(--vocs-color_codeBlockBackground)] p-2 text-[var(--vocs-color_text)] text-sm">
          Signature request cancelled or failed
        </div>
      )}
      {signedData && (
        <div className="space-y-2">
          {isVerifying ? (
            <div className="rounded-md border border-[var(--vocs-color_codeInlineBorder)] bg-[var(--vocs-color_codeBlockBackground)] p-2 text-[var(--vocs-color_text)] text-sm">
              Verifying signature...
            </div>
          ) : verificationResult !== null ? (
            <div
              className={`rounded-md border border-[var(--vocs-color_codeInlineBorder)] bg-[var(--vocs-color_codeBlockBackground)] p-2 text-sm ${
                verificationResult
                  ? "text-green-500"
                  : "text-[var(--vocs-color_text)]"
              }`}
            >
              {verificationResult ? "✓ Valid Signature" : "✗ Invalid Signature"}
            </div>
          ) : null}
          {verificationError && (
            <div className="rounded-md border border-[var(--vocs-color_codeInlineBorder)] bg-[var(--vocs-color_codeBlockBackground)] p-2 text-[var(--vocs-color_text)] text-sm">
              Error: {verificationError}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ConnectComponent = () => {
  const walletClient = useClient();
  const { data: connectorClient } = useConnectorClient();
  const connections = useConnections();
  const [url, setUrl] = useState<string | undefined>(undefined);

  console.log("connectorClient", connectorClient);
  console.log("connections", connections);

  if (!walletClient) return <div>No walletclient found</div>;

  return (
    <div className="space-y-1 border-[var(--vocs-color_codeInlineBorder)] border-b pb-2">
      <div>
        You can connect to a dApp by entering its connection URL and hitting
        connect.
      </div>
      <div className="flex items-center gap-2">
        <div className="grow">
          <input
            type="text"
            value={url}
            className="!bg-[var(--vocs-color_codeTitleBackground)] hover:!bg-[var(--vocs-color_codeBlockBackground)] block w-full grow rounded-lg border border-[var(--vocs-color_codeInlineBorder)] px-4 py-1 placeholder:text-neutral-500"
            onChange={(e) => setUrl(e.target.value)}
            placeholder="openlv://..."
          />
        </div>
        <button
          onClick={async () => {
            if (!url) return;

            console.log("connecting to ", url);
            const client =
              (await connections[0]?.connector?.getProvider()) as EIP1193Provider;

            session = await connectSession(url, async (message) => {
              console.log("received message", message);
              const { method } = message as { method: string };

              console.log("wc", walletClient);

              console.log("method", method);

              if (method === "eth_accounts") {
                const result = await client.request({
                  method: "eth_accounts",
                  params: [] as never,
                });

                if (result) return result;
              }

              if (method === "eth_chainId") {
                const result = await client.request({
                  method: "eth_chainId",
                  params: [] as never,
                });

                console.log("result from calling wallet", result);

                return result;
              }

              if (["personal_sign"].includes(method)) {
                const result = await client.request(message as never);

                console.log("result from calling wallet", result);

                return result;
              }

              return { result: "success" };
            });
            console.log("session", session);

            await session.connect();
            console.log("session connected", session);
          }}
          className="!bg-[var(--vocs-color_codeTitleBackground)] hover:!bg-[var(--vocs-color_codeBlockBackground)] rounded-lg border border-[var(--vocs-color_codeInlineBorder)] px-4 py-1"
        >
          Connect
        </button>
      </div>
    </div>
  );
};

const Connected = () => {
  const { disconnect } = useDisconnect();
  const { address, connector } = useAccount();

  return (
    <div className="rounded-lg border border-[var(--vocs-color_codeInlineBorder)] bg-[var(--vocs-color_codeBlockBackground)] px-4 py-4">
      <div className="mb-2 flex items-center justify-between gap-2 border-[var(--vocs-color_codeInlineBorder)] border-b pb-2">
        <div className="flex items-center gap-2">
          {connector?.icon && (
            <img
              src={connector.icon}
              alt={`${connector.name} icon`}
              className="h-10 w-10 rounded-md"
            />
          )}
          <div>Connected to {trimAddress(address)}</div>
        </div>
        <button
          onClick={() => {
            disconnect();
          }}
          className="!bg-[var(--vocs-color_codeTitleBackground)] hover:!bg-[var(--vocs-color_codeBlockBackground)] rounded-lg border border-[var(--vocs-color_codeInlineBorder)] px-4 py-1"
        >
          Disconnect
        </button>
      </div>
      <div className="space-y-2">
        {connector?.type !== "openLv" && <ConnectComponent />}
        <TestSign />
      </div>
    </div>
  );
};

const ConnectorPreview = ({ connector }: { connector: Connector }) => {
  const { connect } = useConnect();

  return (
    <button
      className="hover:!bg-[var(--vocs-color_codeHighlightBackground)] inline-flex translate-y-0.5 items-center gap-2 rounded-lg border border-[var(--vocs-color_codeInlineBorder)] px-2 py-0.5"
      onClick={() => {
        connect({ connector: connector });
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
    (connector) => connector.type === "openLv",
  );
  const firstNonOpenLvConnector = connectors.find(
    (connector) => connector.type !== "openLv",
  );

  return (
    <>
      <div className="mt-4 space-y-2 p-2">
        <ul className="mx-auto w-full max-w-xs space-y-2">
          {connectors.map((connector) => (
            <li key={connector.id} className="">
              <button
                onClick={() => {
                  connect({ connector: connector });
                }}
                className={classNames(
                  "!bg-[var(--vocs-color_codeBlockBackground)] flex w-full items-center justify-between rounded-lg px-4 py-2 text-sm",
                  connector.type === "openLv"
                    ? "hover:!bg-[var(--vocs-color_backgroundAccent)]/10 border border-[var(--vocs-color_codeInlineText)]"
                    : "hover:!bg-[var(--vocs-color_codeHighlightBackground)]",
                )}
              >
                <span
                  className={classNames(
                    "font-bold text-sm",
                    connector.type === "openLv" &&
                      "text-[var(--vocs-color_codeInlineText)]",
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
      <div className="w-full rounded-b-md border-[var(--vocs-color_codeInlineBorder)] border-t bg-[var(--vocs-color_codeBlockBackground)] px-4 py-2">
        <div>
          The above is a sample wagmi snippet. You can use it to test out openlv
          right here! <br />
          <div>
            <div>Steps:</div>
            <ul className="list-inside list-disc">
              <li>
                Open this page in <span className="font-bold">a new tab</span>
              </li>
              <li>
                Click
                {openLvConnector && (
                  <ConnectorPreview connector={openLvConnector} />
                )}{" "}
                on one and{" "}
                {firstNonOpenLvConnector ? (
                  <ConnectorPreview connector={firstNonOpenLvConnector} />
                ) : (
                  <span className="font-bold">your wallet</span>
                )}{" "}
                on the other
              </li>
              <li>Copy the connection URL</li>
              <li>Watch the magic happen</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export const Inner = () => {
  const { isConnected } = useAccount();

  return (
    <div className="space-y-2">
      {match(isConnected)
        .with(true, () => <Connected />)
        .with(false, () => <Connectors />)
        .exhaustive()}
    </div>
  );
};

export const Outter = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <Inner />
      </WagmiProvider>
    </QueryClientProvider>
  );
};

export const TryItOut = () => {
  const inBrowser = typeof window !== "undefined";

  return (
    <div
      className="rounded-lg border border-[var(--vocs-color_codeInlineBorder)]"
      suppressHydrationWarning
    >
      {inBrowser && <Outter />}
    </div>
  );
};
