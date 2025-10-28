/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */
import { useCallback } from 'preact/hooks';
import QRCode from 'qrcode-generator';
import { match, P } from 'ts-pattern';

import { useSession } from '../hooks/useSession';
import { UnknownState } from './UnknownState';

interface ConnectionFlowProps {
    onClose: () => void;
    onCopy: (uri: string) => void;
}

const LoadingSpinner = () => (
    <div className="flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>
);

export const ConnectionFlow = ({ onClose, onCopy }: ConnectionFlowProps) => {
    const { uri, status: sessionStatus = { status: 'created' } } = useSession();
    const connectedAccount = '';

    const handleCopy = useCallback(() => {
        if (uri) {
            onCopy(uri);
        }
    }, [uri, onCopy]);

    const generateQRCode = useCallback((uri: string) => {
        const qr = QRCode(0, 'M');

        qr.addData(uri);
        qr.make();

        return qr.createSvgTag({ cellSize: 5, margin: 0, scalable: true });
    }, []);

    console.log('connection flow here: ', sessionStatus);

    return match(sessionStatus)
        .with({ status: 'disconnected' }, () => <div>hi</div>)
        .with({ status: P.union('created', 'signaling', 'connected', 'ready') }, (x) =>
            match(x.signaling)
                .with({ state: 'connecting' }, () => (
                    <div className="flex flex-col items-center gap-4 p-6">
                        <LoadingSpinner />
                        <div className="text-center">
                            <h3 className="mb-2 font-semibold text-gray-900 text-lg">Connecting</h3>
                            <p className="text-gray-500 text-sm">
                                Waiting for wallet to connect...
                            </p>
                        </div>
                    </div>
                ))
                .with({ state: 'handshake-open' }, () => (
                    <div className="flex flex-col items-center gap-4 px-2">
                        <div className="w-full space-y-4 rounded-md border border-neutral-200 bg-neutral-100 p-4">
                            {uri && (
                                <div className="relative mx-auto flex w-fit items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                                    <div
                                        className="flex h-[200px] w-[200px] cursor-pointer items-center justify-center"
                                        onClick={handleCopy}
                                        title="Click to copy connection URL"
                                        dangerouslySetInnerHTML={{ __html: generateQRCode(uri) }}
                                    />
                                </div>
                            )}

                            <div className="w-full">
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-200 px-4 py-2 text-gray-700 text-sm transition hover:bg-gray-300"
                                >
                                    Copy Connection URL
                                </button>
                            </div>
                        </div>
                        <div className="w-full">
                            <span>Scan the link above using your mobile wallet.</span>
                            <br />
                            <span>Or copy the link and paste it into your wallet.</span>
                        </div>
                    </div>
                ))
                .with({ state: 'handshake-closed' }, () => (
                    <div className="flex flex-col items-center gap-4 p-6">
                        <div className="text-center">
                            <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                                Establishing e2e encryption...
                            </h3>
                        </div>
                    </div>
                ))
                .with({ state: 'xr-encrypted' }, () => (
                    <div className="flex flex-col items-center gap-4 p-6">
                        <div className="text-center">
                            <div className="mb-4 text-4xl">✅</div>
                            <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                                Connected Successfully!
                            </h3>
                            {connectedAccount && (
                                <p className="mb-4 text-gray-500 text-sm">
                                    Connected with: {connectedAccount.slice(0, 6)}...
                                    {connectedAccount.slice(-4)}
                                </p>
                            )}
                            <p className="text-gray-500 text-sm">
                                Your wallet is now connected and ready to use.
                            </p>
                        </div>
                    </div>
                ))
                .with({ state: 'disconnected' }, () => (
                    <div className="flex flex-col items-center gap-4 p-6">
                        <div className="text-center">
                            <div className="mb-4 text-4xl">🔌</div>
                            <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                                Disconnected
                            </h3>
                            <p className="mb-4 text-gray-500 text-sm">
                                The connection has been closed.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 text-sm transition hover:bg-gray-200"
                        >
                            Close
                        </button>
                    </div>
                ))
                .otherwise(() => <UnknownState state={sessionStatus} />)
        )
        .otherwise(() => <UnknownState state={sessionStatus} />);
};
