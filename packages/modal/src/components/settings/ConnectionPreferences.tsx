import classNames from 'classnames';

const PREFERENCES_TEMPLATE = {
	retainHistory: true,
	autoReconnect: true,
} as const;

export const ConnectionPreferences = () => {
	const preferences = PREFERENCES_TEMPLATE;

	const renderToggle = (label: string, description: string, value: boolean) => (
		<div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
			<div className="min-w-0 flex-1">
				<div className="font-semibold text-gray-900 text-sm">{label}</div>
				<p className="mt-1 text-gray-500 text-xs">{description}</p>
			</div>
			<div className="flex items-center rounded-full bg-gray-200 p-0.5">
				<button
					type="button"
					disabled
					className={classNames(
						'rounded-full px-3 py-1 text-xs font-semibold transition',
						!value ? 'bg-emerald-400 text-white shadow' : 'text-gray-600'
					)}
				>
					NO
				</button>
				<button
					type="button"
					disabled
					className={classNames(
						'rounded-full px-3 py-1 text-xs font-semibold transition',
						value ? 'bg-emerald-400 text-white shadow' : 'text-gray-600'
					)}
				>
					YES
				</button>
			</div>
		</div>
	);

	return (
		<div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
			<h3 className="font-semibold text-gray-900 text-lg">Connection preferences</h3>
			<p className="mt-1 text-gray-500 text-sm">
				Adjust before connecting. Your choices stay on this device.
			</p>
			<div className="mt-4 flex flex-col gap-3">
				{renderToggle(
					'Retain session history',
					'Keep recent connection details saved on this device.',
					preferences.retainHistory
				)}
				{renderToggle(
					'Auto reconnect',
					'Requires retained session history to reconnect automatically.',
					preferences.autoReconnect
				)}
			</div>
		</div>
	);
};
