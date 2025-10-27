/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */
import classNames from 'classnames';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { match, P } from 'ts-pattern';

import { OPENLV_ICON_128 } from '../assets/logo';
import { getDefaultModalPreferences, type ModalPreferences } from '../preferences';
import type { ConnectionInfo } from '../types/connection';
import { ConnectionFlow } from './ConnectionFlow';
import { Header } from './Header';
import { ModalSettings } from './ModalSettings';

export interface ModalRootProps {
    uri?: string;
    title?: string;
    subtitle?: string;
    onClose?: () => void;
    initialPreferences?: ModalPreferences;
    onPreferencesChange?: (preferences: ModalPreferences) => void;
    continueLabel?: string;
    connectionInfo?: ConnectionInfo;
    onStartConnection?: () => void;
    onRetry?: () => void;
    onCopy?: (uri: string) => void;
}

type ModalView = 'start' | 'uri' | 'settings';

type PreferenceKey = keyof ModalPreferences;

const copyToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false;

    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);

            return true;
        }
    } catch (error) {
        console.warn('OpenLV modal: Clipboard API failed, falling back', error);
    }

    try {
        const textArea = document.createElement('textarea');

        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');

        document.body.removeChild(textArea);

        return result;
    } catch (fallbackError) {
        console.error('OpenLV modal: fallback copy failed', fallbackError);

        return false;
    }
};

const useModalState = (
    uri: string,
    initialPreferences: ModalPreferences,
    onPreferencesChange?: (preferences: ModalPreferences) => void
) => {
    const [view, setView] = useState<ModalView>('start');
    const [copied, setCopied] = useState(false);
    const [isQrHovering, setIsQrHovering] = useState(false);
    const [isUrlHovering, setIsUrlHovering] = useState(false);
    const [preferences, setPreferences] = useState<ModalPreferences>(initialPreferences);

    useEffect(() => {
        setPreferences(initialPreferences);
    }, [initialPreferences]);

    useEffect(() => {
        if (!copied) return;

        const timeout = window.setTimeout(() => setCopied(false), 2000);

        return () => window.clearTimeout(timeout);
    }, [copied]);

    useEffect(() => {
        setView('uri');
    }, [uri]);

    const handlePreferenceToggle = useCallback(
        (key: PreferenceKey) => {
            setPreferences((current) => {
                const next = { ...current, [key]: !current[key] };

                onPreferencesChange?.(next);

                return next;
            });
        },
        [onPreferencesChange]
    );

    return {
        view,
        setView,
        copied,
        setCopied,
        isQrHovering,
        setIsQrHovering,
        isUrlHovering,
        setIsUrlHovering,
        preferences,
        handlePreferenceToggle,
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
    uri,
    title = 'Connect Wallet',
    onClose,
    initialPreferences = getDefaultModalPreferences(),
    onPreferencesChange,
    continueLabel = 'Save & continue',
    connectionInfo,
    onStartConnection,
    onRetry,
    onCopy,
}: ModalRootProps) => {
    const { view, setView, copied, setCopied, preferences, handlePreferenceToggle } = useModalState(
        uri || '',
        initialPreferences,
        onPreferencesChange
    );

    const safeOnClose = useCallback(() => {
        onClose?.();
    }, [onClose]);

    useEscapeToClose(safeOnClose);

    const handleCopy = useCallback(async () => {
        const success = await copyToClipboard(uri);

        if (success) setCopied(true);
    }, [uri, setCopied]);

    const handleStartConnection = useCallback(() => {
        // This will be handled by the connector - don't close the modal
        onStartConnection?.();
    }, [onStartConnection]);

    const closeSession = useCallback(() => {
        console.log('closing session');
        onClose?.();
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30 p-4 font-sans text-slate-800 animate-[bg-in_0.15s_ease-in-out]"
            onClick={safeOnClose}
            role="presentation"
            data-openlv-modal-root
        >
            <div
                className="relative w-full max-w-[400px] rounded-2xl bg-gray-50 p-4 text-center border space-y-4 animate-[fade-in_0.15s_ease-in-out]"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(event) => event.stopPropagation()}
            >
                <Header
                    onBack={() =>
                        match({ view, info: connectionInfo?.state })
                            .with({ view: 'settings' }, () => setView('uri'))
                            .with({ view: 'uri', info: P.not('idle') }, () => closeSession())
                            .otherwise(() => safeOnClose())
                    }
                    onToggleSettings={() => setView(view === 'settings' ? 'uri' : 'settings')}
                    title={title}
                    view={view}
                />

                {match(view)
                    .with('uri', () => (
                        <ConnectionFlow
                            connectionInfo={connectionInfo || { state: 'idle' }}
                            onStartConnection={handleStartConnection}
                            onRetry={onRetry || (() => {})}
                            onClose={safeOnClose}
                            onCopy={onCopy || handleCopy}
                        />
                    ))
                    .with('settings', () => (
                        <ModalSettings
                            continueLabel={continueLabel}
                            onBack={() => setView('start')}
                            onToggle={handlePreferenceToggle}
                            preferences={preferences}
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

                <div className="mt-6 flex items-center gap-2 text-gray-500">
                    <a
                        href="https://github.com/v3xlabs/open-lavatory"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-500"
                    >
                        <img
                            src={OPENLV_ICON_128}
                            alt="Open Lavatory Logo"
                            width={20}
                            height={20}
                            className="rounded"
                        />
                        <span>openlv</span>
                    </a>
                </div>
            </div>
        </div>
    );
};
