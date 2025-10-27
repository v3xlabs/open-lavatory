import classNames from 'classnames';

export interface ModalSettingsProps {
    onBack: () => void;
    continueLabel: string;
}

export const ModalSettings = ({ onBack, continueLabel }: ModalSettingsProps) => {
    const renderToggle = (label: string, description: string) => (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-100 p-4">
            <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900">{label}</div>
                <p className="mt-1 text-xs text-gray-500">{description}</p>
            </div>
            <button
                type="button"
                // role="switch"
                // aria-checked={preferences[key]}
                // onClick={() => onToggle(key)}
                className={classNames(
                    'relative h-6 w-10 cursor-pointer rounded-full transition-colors'
                    // preferences[key] ? 'bg-blue-500' : 'bg-gray-200'
                )}
            >
                {/* <span
                    className="absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white border transition-transform"
                    style={{
                        transform: preferences[key] ? 'translateX(18px)' : 'translateX(0)',
                    }}
                /> */}
            </button>
        </div>
    );

    return (
        <div className="flex flex-col gap-4 text-left">
            <div>
                <h3 className="text-lg font-semibold text-gray-900">Connection preferences</h3>
                <p className="mt-1 text-sm text-gray-500">
                    Adjust before connecting. Your choices stay on this device.
                </p>
            </div>
            <div className="flex flex-col gap-3">
                {renderToggle(
                    'Remember this device',
                    'Automatically reconnect on this browser next time.'
                )}
                {renderToggle('Blur QR for privacy', 'Keep the QR hidden until you hover over it.')}
            </div>
            <button
                type="button"
                className="mt-2 w-full rounded-lg bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
                onClick={onBack}
            >
                {continueLabel}
            </button>
        </div>
    );
};
