import { type Connector, type CreateConnectorFn, useAccount, useConnect } from "wagmi";

export const ConnectorCard = ({
  connector,
  refreshKey,
}: {
  connector: Connector<CreateConnectorFn>;
  refreshKey: number;
}) => {
  const { connect, isPending } = useConnect();
  const { isConnected } = useAccount();

  return (
    <div
      // eslint-disable-next-line no-restricted-syntax
      key={`${connector.id}-${refreshKey}`}
      className="flex flex-col rounded-lg border border-gray-200 p-4 transition-colors duration-200 hover:border-gray-300"
    >
      <div className="mb-3 flex items-start gap-3">
        {connector.icon && (
          <img
            src={connector.icon}
            alt={`${connector.name} icon`}
            className="h-8 w-8 rounded"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-gray-800">{connector.name}</h3>
          <p className="text-gray-500 text-xs">{connector.type}</p>
        </div>
        {connector.installed !== undefined && (
          <div
            className={`h-2 w-2 rounded-full ${
              connector.installed ? "bg-green-500" : "bg-gray-300"
            }`}
            title={connector.installed ? "Installed" : "Not installed"}
          />
        )}
      </div>

      <div className="mb-3 grow space-y-1 text-gray-500 text-xs">
        {(["id", "type", "uid", "rdns"] as (keyof typeof connector)[]).map(key =>
          (connector[key]
            ? (
                <div className="flex justify-between" key={key}>
                  <span>
                    {key.toUpperCase()}
                    :
                  </span>
                  <span className="truncate font-mono text-xs">
                    {connector[key] as string}
                  </span>
                </div>
              )
            : null),
        )}
      </div>

      <button
        onClick={() => connect({ connector: connector })}
        disabled={isPending || isConnected}
        className="w-full rounded-md bg-blue-500 py-2 font-medium text-sm text-white transition-colors duration-200 hover:bg-blue-600 disabled:bg-gray-300"
      >
        {isPending ? "Connecting..." : "Connect"}
      </button>
    </div>
  );
};
