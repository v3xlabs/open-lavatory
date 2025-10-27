/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */

import type { OpenLVProvider } from '@openlv/provider';
import classNames from 'classnames';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { match, P } from 'ts-pattern';

import { copyToClipboard } from '../hooks/useClipboard';
import { useProvider } from '../hooks/useProvider';
import { ConnectionFlow } from './ConnectionFlow';
import { Footer } from './Footer';
import { Header } from './Header';
import { ModalSettings } from './ModalSettings';

export interface ModalRootProps {
    onClose?: () => void;
    onStartConnection?: () => void;
    onRetry?: () => void;
    onCopy?: (uri: string) => void;
    provider: OpenLVProvider;
}

type ModalView = 'start' | 'uri' | 'settings';

const useModalState = (provider: OpenLVProvider) => {
    const [view, setView] = useState<ModalView>(provider.getSession() ? 'uri' : 'start');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;

        const timeout = window.setTimeout(() => setCopied(false), 2000);

        return () => window.clearTimeout(timeout);
    }, [copied]);

    return {
        view,
        setView,
        copied,
        setCopied,
    };
};

const useEscapeToClose = (handler: () => void) => {
    useEffect(() => {
        const keyHandler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') handler();
        };

        document.addEventListener('keydown', keyHandler);

        return () => document.removeEventListener('keydown', keyHandler);
    }, [handler]);
};

export const ModalRoot = ({
    onClose = () => {},
    onStartConnection,
    provider,
    onRetry,
    onCopy,
}: ModalRootProps) => {
    const { view, setView, copied, setCopied } = useModalState(provider);
    const { uri } = useProvider(provider);
    const title = 'Connect Wallet';
    const continueLabel = 'Save & continue';

    useEscapeToClose(onClose);

    const handleCopy = useCallback(async () => {
        const success = uri && (await copyToClipboard(uri));

        if (success) setCopied(true);
    }, [uri, setCopied]);

    const handleStartConnection = useCallback(() => {
        // This will be handled by the connector - don't close the modal
        onStartConnection?.();
    }, [onStartConnection]);

    const closeSession = useCallback(async () => {
        console.log('closing session');
        onClose();

        await provider.closeSession();
    }, [onClose, provider]);

    console.log('view', view);

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30 p-4 font-sans text-slate-800 animate-[bg-in_0.15s_ease-in-out] backdrop-blur-sm"
            onClick={onClose}
            role="presentation"
            data-openlv-modal-root
        >
            <div
                className="relative w-full max-w-[400px] rounded-2xl bg-gray-50 p-4 text-center space-y-4 animate-[fade-in_0.15s_ease-in-out]"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(event) => event.stopPropagation()}
            >
                <Header
                    onBack={() =>
                        match({ view })
                            .with({ view: 'settings' }, () => setView('uri'))
                            .with({ view: 'uri' }, () => closeSession())
                            .otherwise(() => onClose())
                    }
                    onToggleSettings={() => setView(view === 'settings' ? 'uri' : 'settings')}
                    title={title}
                    view={view}
                />

                {match(view)
                    .with(P.union('uri', 'start'), () => (
                        <ConnectionFlow
                            onStartConnection={handleStartConnection}
                            onRetry={onRetry || (() => {})}
                            onClose={onClose}
                            onCopy={onCopy || handleCopy}
                        />
                    ))
                    .with('settings', () => (
                        <ModalSettings
                            continueLabel={continueLabel}
                            onBack={() => setView('start')}
                        />
                    ))
                    .otherwise(() => null)}

                <div
                    className={classNames(
                        'absolute right-5 top-5 rounded-lg bg-blue-500 px-4 py-3 text-sm font-medium text-white transition-all',
                        copied ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                    )}
                >
                    📋 Connection URL copied to clipboard!
                </div>

                <Footer />
            </div>
        </div>
    );
};
