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
    <div className="bg-white border rounded-md p-4 space-y-2">
      <h1>Signature</h1>
      <div className="w-full">
        <button onClick={() => signMessage({ message })} className="btn w-full" disabled={!enabled}>Sign Message</button>
      </div>
      {signature && (
        <div>
          Signature:
          {signature}
        </div>
      )}
      {
        verificationResult && (
          <div>
            Verification Result:
            {verificationResult ? "Valid" : "Invalid"}
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
      <div className="w-full">
        <button onClick={reset} className="btn w-full" disabled={!enabled}>Reset</button>
      </div>
    </div>
  );
};
