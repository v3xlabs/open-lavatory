import type { FC } from "react";
import { useSendTransaction } from "wagmi";

export const PlaygroundTransaction: FC<{ enabled: boolean; }> = ({ enabled }) => {
  const { sendTransaction, data: transaction, error, isPending, reset } = useSendTransaction();

  return (
    <div className="bg-white border rounded-md p-4 flex flex-col gap-4 justify-between">
      <div>
        <h1>Transaction</h1>
      </div>
      <div>
        <button className="btn w-full" disabled={!enabled}>Send Transaction</button>
      </div>
    </div>
  );
};
