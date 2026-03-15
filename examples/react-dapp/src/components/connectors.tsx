/* eslint-disable no-restricted-syntax */
import type { FC } from "react";
import { LuLoader } from "react-icons/lu";
import { type Connector, useConnect, useConnectors } from "wagmi";

const Connector: FC<{ connector: Connector; }> = ({ connector }) => {
  const { connect, isPending } = useConnect();

  return (
    <li key={connector.id} className="w-full">
      <button onClick={() => connect({ connector })} className="border p-2 flex items-center justify-between gap-2 w-full rounded-md hover:bg-gray-100">
        <span className="flex items-center gap-2">
          {
            connector.icon && (
              <img src={connector.icon} alt={`${connector.name} icon`} className="w-4 h-4" />
            )
          }
          <span>
            {connector.name}
          </span>
        </span>
        <span>
          {isPending && (
            <LuLoader className="w-4 h-4 animate-spin" />
          )}
        </span>
      </button>
    </li>
  );
};

export const Connectors = () => {
  const connectors = useConnectors();

  return (
    <ul className="space-y-2 p-3">
      {
        connectors.map(connector => (
          <Connector key={connector.id} connector={connector} />
        ))
      }
    </ul>
  );
};
