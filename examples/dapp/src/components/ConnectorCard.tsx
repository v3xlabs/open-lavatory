import { Connector, CreateConnectorFn, useAccount, useConnect } from 'wagmi';

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
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors duration-200 flex flex-col"
        >
            <div className="flex items-start gap-3 mb-3">
                {connector.icon && (
                    <img
                        src={connector.icon}
                        alt={`${connector.name} icon`}
                        className="w-8 h-8 rounded"
                    />
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-800 truncate">{connector.name}</h3>
                    <p className="text-xs text-gray-500">{connector.type}</p>
                </div>
                {typeof connector.installed !== 'undefined' && (
                    <div
                        className={`w-2 h-2 rounded-full ${
                            connector.installed ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        title={connector.installed ? 'Installed' : 'Not installed'}
                    />
                )}
            </div>

            <div className="space-y-1 mb-3 text-xs text-gray-500 grow">
                {(['id', 'type', 'uid', 'rdns'] as (keyof typeof connector)[]).map((key) =>
                    connector[key] ? (
                        <div className="flex justify-between" key={key}>
                            <span>{key.toUpperCase()}:</span>
                            <span className="font-mono text-xs truncate">
                                {connector[key] as string}
                            </span>
                        </div>
                    ) : null
                )}
            </div>

            <button
                onClick={() => connect({ connector: connector })}
                disabled={isPending || isConnected}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 rounded-md transition-colors duration-200 text-sm font-medium"
            >
                {isPending ? 'Connecting...' : 'Connect'}
            </button>
        </div>
    );
};
