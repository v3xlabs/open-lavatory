import type { FC } from "react";
import type { Address } from "viem";
import { useAccount, useDisconnect, useEnsName } from "wagmi";

const formatAddress = (address: Address) => `${address.slice(0, 6)}...${address.slice(-4)}`;

const AddressInfo: FC<{ address: Address; }> = ({ address }) => {
  const { data: ensName } = useEnsName({ address });
  const formattedAddress = formatAddress(address);

  return (
    <div className="">
      <div className="text-sm text-gray-500">
        {ensName || formattedAddress}
      </div>
      {ensName && (
        <div className="text-sm text-gray-500">
          {formattedAddress}
        </div>
      )}
    </div>
  );
};

export const Connected = () => {
  const { address, connector } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <div className="flex flex-col items-start gap-2 w-full max-w-full overflow-hidden rounded-md">
      <div className="w-full bg-green-500 p-2 text-white">
        Connected
      </div>
      <div className="w-full max-w-full overflow-hidden p-3 pt-1">
        {
          connector && (
            <div className="flex items-center gap-1">
              {connector.icon && (
                <img src={connector.icon} alt={`${connector.name} icon`} className="w-4 h-4" />
              )}
              <div>
                {connector.name}
              </div>
            </div>
          )
        }
        <span className="text-sm text-gray-500">
          <AddressInfo address={address as Address} />
        </span>
        <span className="text-sm text-gray-500">
          {connector?.name}
        </span>
        <span className="text-sm text-gray-500">
          {connector?.type}
        </span>
        <button
          onClick={() => disconnect()}
          className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 p-2 rounded-md w-full"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
};
