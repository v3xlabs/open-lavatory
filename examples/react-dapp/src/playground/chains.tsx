/* eslint-disable no-restricted-syntax */
import type { FC } from "react";
import { useChainId, useSwitchChain } from "wagmi";

export const PlaygroundChains: FC<{ enabled: boolean; }> = ({ enabled }) => {
  const { chains, switchChain } = useSwitchChain();
  const chainId = useChainId();

  return (
    <div className="bg-white border rounded-md p-4">
      <h2>Chains</h2>
      <ul className="space-y-2">
        {chains.map(chain => (
          <li key={chain.id}>
            <button
              onClick={() => switchChain({ chainId: chain.id })}
              className={[
                "btn w-full",
                chainId === chain.id ? "btn-primary" : "btn-secondary",
              ].filter(Boolean).join(" ")}
              disabled={!enabled}
            >
              {chain.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
