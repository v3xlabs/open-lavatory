/* eslint-disable no-restricted-syntax */
import "../styles.css";

import { openlv } from "@openlv/connector";
import { connectSession, Session } from "@openlv/session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import classNames from "classnames";
import { useState } from "react";
import { match } from "ts-pattern";
import type { Address } from "viem";
import {
  createConfig,
  http,
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage,
  useWalletClient,
  WagmiProvider,
} from "wagmi";
import { mainnet } from "wagmi/chains";

const queryClient = new QueryClient();

const config = createConfig({
  chains: [mainnet],
  connectors: [openlv()],
  transports: {
    [mainnet.id]: http(),
  },
});

const trimAddress = (address: Address | undefined | null) => {
  if (!(typeof address === "string")) return address;

  return `${address.slice(0, 5)}...${address.slice(-4)}`;
};

let session: Session | undefined = undefined;

const TestSign = () => {
  const { signMessage, data: signedData } = useSignMessage();

  return (
    <div className="flex justify-between">
      <div className="flex items-center gap-2">
        <div>Test a personal sign</div>
        {signedData && (
          <div className="rounded-md border border-amber-300 p-2 text-gray-500 text-sm">
            Signed Data: {JSON.stringify(signedData)}
          </div>
        )}
      </div>
      <button
        onClick={() => {
          signMessage({ message: "Hello, world!" });
        }}
        className="!bg-[var(--vocs-color_codeTitleBackground)] hover:!bg-[var(--vocs-color_codeBlockBackground)] rounded-lg border border-[var(--vocs-color_codeInlineBorder)] px-4 py-1"
      >
        Sign Message
      </button>
    </div>
  );
};

const ConnectComponent = () => {
  const { data: walletClient } = useWalletClient();
  const [url, setUrl] = useState<string | undefined>(undefined);

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
            session = await connectSession(url, async (message) => {
              console.log("received message", message);
              const { method } = message as { method: string };

              if (method === "eth_accounts") {
                const result = await walletClient?.transport.request({
                  method: "eth_accounts",
                  params: [],
                });

                if (result) return result;
              }

              if (["personal_sign"].includes(method)) {
                return await walletClient?.transport.request(message as never);
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

const Connectors = () => {
  const { connect, connectors } = useConnect();

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
        <div>The above is a sample wagmi snippet</div>
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
