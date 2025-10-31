import { AccordionItem } from '../ui/Accordion';
import { InputGroup } from '../ui/Input';

const TRANSPORT_TEMPLATE = {
	type: 'WebRTC',
	iceServers: ['stun:stun.l.google.com:19302'],
	turnServers: ['turn:user@turn.example.com'],
} as const;

export const TransportSettings = () => {
	const transport = TRANSPORT_TEMPLATE;

	return (
		<AccordionItem
			title="Transport"
			action={
				<span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
					{transport.type}
				</span>
			}
			defaultOpen={false}
		>
			<div className="grid gap-4">
			<InputGroup
				label="ICE Servers"
				values={transport.iceServers}
				placeholder="stun:stun.l.google.com:19302"
			/>
			<InputGroup
				label="Tu(r)n Servers"
				values={transport.turnServers}
				placeholder="turn:user@turn.example.com"
			/>
			</div>
		</AccordionItem>
	);
};
