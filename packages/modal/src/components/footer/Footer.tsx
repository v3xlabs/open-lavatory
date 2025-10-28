import { match, P } from 'ts-pattern';

import { OPENLV_ICON_128 } from '../../assets/logo';
import { useProvider } from '../../hooks/useProvider';
import { useSession } from '../../hooks/useSession';

const FooterStatus = () => {
    const { status: sessionStatus } = useSession();
    const { status: providerStatus } = useProvider();

    const data = match(providerStatus)
        .with('disconnected', () => undefined)
        .with(P.union('connected', 'connecting', 'error'), () =>
            match(sessionStatus)
                .with({ status: 'disconnected' }, () => ({ icon: '🫲', text: 'Disconnected' }))
                .with({ status: 'signaling' }, (x) =>
                    match(x.signaling)
                        .with({ state: 'handshake-open' }, () => ({
                            icon: '👋',
                            text: 'Handshake Open',
                        }))
                        .with({ state: 'handshake-closed' }, () => ({
                            icon: '🤝',
                            text: 'Handshake Closed',
                        }))
                        .otherwise(() => ({ icon: '❓', text: 'Unknown ' + x.signaling?.state }))
                )
                .otherwise((status) => ({ icon: '❓', text: 'Unknown ' + JSON.stringify(status) }))
        )
        .otherwise(() => ({
            icon: '❓',
            text: 'Unknown provider status ' + JSON.stringify(providerStatus),
        }));

    if (!data) return <></>;

    return (
        <div className="group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-gray-100">
            <div className="text-gray-900 text-xs opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                {data.text}
            </div>
            <div>{data.icon}</div>
        </div>
    );
};

export const Footer = () => (
    <div className="mt-6 flex items-center justify-between gap-2 text-gray-500">
        <a
            href="https://github.com/v3xlabs/open-lavatory"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 font-semibold text-gray-500 text-sm"
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
        <div className="text-gray-500 text-sm">
            <FooterStatus />
        </div>
    </div>
);
