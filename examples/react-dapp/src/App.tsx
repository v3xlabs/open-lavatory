import { useAccount } from "wagmi";

import { Connected } from "./components/connected.tsx";
import { Connectors } from "./components/connectors.tsx";
import { PlaygroundChains } from "./playground/chains.tsx";
import { PlaygroundERC20Permit } from "./playground/erc20permit.tsx";
import { PlaygroundSignature } from "./playground/signature.tsx";
import { PlaygroundTransaction } from "./playground/transaction.tsx";

export const App = () => {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="bg-white border rounded-md max-w-xs mx-auto w-full">
            {!isConnected && <Connectors />}
            {isConnected && <Connected />}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
            <PlaygroundChains enabled={isConnected} />
            <PlaygroundSignature enabled={isConnected} />
            <PlaygroundTransaction enabled={isConnected} />
            <PlaygroundERC20Permit enabled={isConnected} />
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500">
          <p className="text-sm">
            Built with ❤️ using
            {" "}
            <span className="font-semibold text-blue-500">wagmi</span>
            ,
            {" "}
            <span className="font-semibold text-blue-500">viem</span>
            , and
            {" "}
            <span className="font-semibold text-blue-500">React</span>
          </p>
        </div>
      </div>
    </div>
  );
};
