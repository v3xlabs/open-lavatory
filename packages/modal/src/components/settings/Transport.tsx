import { InfoTooltip } from "../ui/InfoTooltip";
import { InputGroup } from "../ui/Input";

const TRANSPORT_TEMPLATE = {
  type: "WebRTC",
  iceServers: ["stun:stun.l.google.com:19302"],
  turnServers: ["turn:user@turn.example.com"],
} as const;

export const TransportSettings = () => {
  const transport = TRANSPORT_TEMPLATE;

  return (
    <div>
      <div className="flex items-end justify-between p-2">
        <div>Transport</div>
        <InfoTooltip variant="icon">Something something very cool</InfoTooltip>
      </div>
      <div className="flex flex-col gap-4 rounded-md bg-[#F4F5F6] p-2">
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
    </div>
  );
};
