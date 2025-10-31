import { Accordion } from '../ui/Accordion';
import { ConnectionPreferences } from './ConnectionPreferences';
import { SignalingSettings } from './Signaling';
import { TransportSettings } from './Transport';

export interface ModalSettingsProps {
	onBack: () => void;
	continueLabel: string;
}

export const ModalSettings = ({ onBack, continueLabel }: ModalSettingsProps) => (
	<div className="flex flex-col px-2 text-left">
		<div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
				<Accordion>
					<SignalingSettings />
					<TransportSettings />
				</Accordion>
				<ConnectionPreferences />
		</div>
		<div className="mt-3 shrink-0 bg-gray-50 pt-1">
			<button
				type="button"
				className="w-full rounded-xl bg-blue-500 px-6 py-3 font-semibold text-sm text-white transition hover:bg-blue-600"
				onClick={onBack}
			>
				{continueLabel}
			</button>
		</div>
	</div>
);

export { ConnectionPreferences } from './ConnectionPreferences';
export { SignalingSettings } from './Signaling';
export { TransportSettings } from './Transport';
