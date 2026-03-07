import type { FC } from "react";
import { useSignTypedData } from "wagmi";

export const PlaygroundERC20Permit: FC<{ enabled: boolean; }> = ({ enabled }) => {
  const { signTypedData, data: signature, error, isPending, reset } = useSignTypedData();

  return (
    <div className="bg-white border rounded-md p-4">
      <h2>ERC20 Permit</h2>
      <button className="btn w-full" disabled={!enabled}>Sign ERC20 Permit</button>
    </div>
  );
};
