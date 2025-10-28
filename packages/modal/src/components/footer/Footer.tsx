import { match, P } from 'ts-pattern';

import { OPENLV_ICON_128 } from '../../assets/logo';
import { useProvider } from '../../hooks/useProvider';
import { useSession } from '../../hooks/useSession';

const FooterStatus = () => {
    const { status: sessionStatus } = useSession();
    const { status: providerStatus } = useProvider();

    return match(providerStatus)
        .with('disconnected', () => '')
        .with(P.union('connected', 'connecting', 'error'), () =>
            match(sessionStatus)
                .with({ status: 'disconnected' }, () => '🫲')
                .with({ status: 'signaling' }, (x) =>
                    match(x.signaling)
                        .with({ state: 'handshake-open' }, () => '👋')
                        .with({ state: 'handshake-closed' }, () => '🤝')
                        .otherwise(() => 'unknown-signaling ' + x.signaling?.state)
                )
                .otherwise((status) => 'unknown ' + JSON.stringify(status))
        )
        .otherwise(() => 'unknown provider status ' + JSON.stringify(providerStatus));
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
