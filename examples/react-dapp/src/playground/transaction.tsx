import type { FC } from "react";
import { useSendTransaction } from "wagmi";

export const PlaygroundTransaction: FC<{ enabled: boolean; }> = ({ enabled }) => {
  const { sendTransaction, data: transaction, error, isPending, reset } = useSendTransaction();

  return (
    <div className="bg-white border rounded-md p-4">
      <h1>Transaction</h1>
      <button className="btn w-full" disabled={!enabled}>Send Transaction</button>
    </div>
  );
};
