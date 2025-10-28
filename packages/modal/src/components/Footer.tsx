import { OPENLV_ICON_128 } from '../assets/logo';

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
        <div>right</div>
    </div>
);
