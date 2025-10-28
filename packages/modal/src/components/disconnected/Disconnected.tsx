import { useSessionStart } from '../../hooks/useSession';

export const Disconnected = () => {
    const { start } = useSessionStart();

    return (
        <div className="flex flex-col items-center gap-4 p-6">
            <div className="text-center">
                <h3 className="mb-2 font-semibold text-gray-900 text-lg">Ready to Connect</h3>
                <p className="mb-4 text-gray-500 text-sm">
                    Click the button below to start the connection process and generate a QR code
                    for your wallet to scan.
                </p>
            </div>
            <button
                type="button"
                onClick={start}
                className="w-full cursor-pointer rounded-lg bg-blue-500 px-6 py-3 font-semibold text-sm text-white transition hover:bg-blue-600"
            >
                Start Connection
            </button>
        </div>
    );
};
