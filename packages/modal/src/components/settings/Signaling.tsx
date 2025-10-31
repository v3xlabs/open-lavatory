import classNames from 'classnames';
import { useState } from 'preact/hooks';
import { match } from 'ts-pattern';

import { AccordionItem } from '../ui/Accordion';
import { InputGroup } from '../ui/Input';

type SignalingProtocol = 'MQTT' | 'NTFY' | 'GUN';

const SIGNALING_TEMPLATE = {
	MQTT: {
		presets: ['Local dev', 'Production', 'Experimental'],
		serverUrls: ['mqtt://broker.example'],
		clientId: 'openlv-client',
		topic: 'openlv/session',
	},
	NTFY: {
		serverUrl: 'https://ntfy.example',
		topics: ['openlv-notify'],
		accessToken: 'ntfy-token',
	},
	GUN: {
		peers: ['https://gun-us.example/gun'],
		soul: 'openlv#session',
	},
} as const;

const protocolOptions: SignalingProtocol[] = ['MQTT', 'NTFY', 'GUN'];

export const SignalingSettings = () => {
	const [selectedProtocol, setSelectedProtocol] = useState<SignalingProtocol>('MQTT');

	return (
		<AccordionItem
			title="Signaling"
			action={
				<span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
					{selectedProtocol}
				</span>
			}
			defaultOpen={false}
		>
			<div className="flex flex-col gap-4">
				<div className="flex flex-wrap gap-2">
					{protocolOptions.map((option) => (
						<button
							key={option}
							type="button"
							onClick={() => setSelectedProtocol(option)}
							aria-pressed={selectedProtocol === option}
							className={classNames(
								'rounded-full border px-4 py-2 text-xs font-semibold transition',
								selectedProtocol === option
									? 'border-blue-500 bg-blue-50 text-blue-600'
									: 'border-gray-300 text-gray-600 hover:border-gray-400'
							)}
						>
							{option}
						</button>
					))}
				</div>
				{match(selectedProtocol)
					.with('MQTT', () => <MqttSettings />)
					.with('NTFY', () => <NtfySettings />)
					.with('GUN', () => <GunSettings />)
					.exhaustive()}
			</div>
		</AccordionItem>
	);
};

const MqttSettings = () => {
	const settings = SIGNALING_TEMPLATE.MQTT;

	return (
		<div className="grid gap-4">
			<InputGroup label="Presets" values={settings.presets} placeholder="Preset name" />
			<InputGroup
				label="Server URLs"
				values={settings.serverUrls}
				placeholder="mqtt://broker.example"
			/>
			<InputGroup
				label="Client ID"
				values={[settings.clientId]}
				placeholder="openlv-client"
			/>
			<InputGroup
				label="Topic"
				values={[settings.topic]}
				placeholder="openlv/session"
			/>
		</div>
	);
};

const NtfySettings = () => {
	const settings = SIGNALING_TEMPLATE.NTFY;

	return (
		<div className="grid gap-4">
			<InputGroup
				label="Server URL"
				values={[settings.serverUrl]}
				placeholder="https://ntfy.sh"
			/>
			<InputGroup label="Topics" values={settings.topics} placeholder="openlv-notify" />
			<InputGroup
				label="Access token"
				values={[settings.accessToken]}
				placeholder="ntfy token (optional)"
			/>
		</div>
	);
};

const GunSettings = () => {
	const settings = SIGNALING_TEMPLATE.GUN;

	return (
		<div className="grid gap-4">
			<InputGroup
				label="Peer URLs"
				values={settings.peers}
				placeholder="https://gun-server.example/gun"
			/>
			<InputGroup
				label="Soul"
				values={[settings.soul]}
				placeholder="openlv#session"
			/>
		</div>
	);
};
