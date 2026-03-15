import type { FC } from "react";
import { useAccount, useChainId, useSignMessage, useVerifyMessage } from "wagmi";

const message = "hello world";

export const PlaygroundSignature: FC<{ enabled: boolean; }> = ({ enabled }) => {
  const chainId = useChainId();
  const { signMessage, data: signature, error, isPending, reset } = useSignMessage();
  const { address } = useAccount();
  const { data: verificationResult, error: verificationError, isLoading: isVerifying } = useVerifyMessage({
    address,
    message,
    signature,
    chainId,
  });

  return (
    <div className="bg-white border rounded-md p-2 gap-2 flex flex-col justify-between">
      <div className="space-y-2">
        <h2 className="px-2 pt-2">Signature</h2>
        <div className="border p-2 bg-gray-100">
          {message}
        </div>
        {signature && (
          <div className="text-wrap w-full break-words">
            Signature:
            {signature}
          </div>
        )}
        {
          verificationResult && (
            <div>
              Verification Result:
              {verificationResult ? <span className="text-green-500">Valid</span> : <span className="text-red-500">Invalid</span>}
            </div>
          )
        }
        {error && (
          <div>
            Error:
            {error.message}
          </div>
        )}
        {isPending && <div>Pending...</div>}
      </div>
      <div className="space-y-2 px-2 pb-2">
        <div className="w-full">
          <button onClick={() => signMessage({ message })} className="btn w-full" disabled={!enabled}>Sign Message</button>
        </div>
        <div className="w-full">
          <button onClick={reset} className="btn w-full" disabled={!enabled}>Reset</button>
        </div>
      </div>
    </div>
  );
};
