import { useState } from "preact/hooks";

import { InfoTooltip } from "../ui/InfoTooltip";
import { Select } from "../ui/Select";

const TRANSPORT_TEMPLATE = {
  type: "WebRTC",
  iceServers: ["stun:stun.l.google.com:19302"],
  turnServers: ["turn:user@turn.example.com"],
} as const;

const transportOptions = ["WebRTC"];

export const TransportSettings = () => {
  const transport = TRANSPORT_TEMPLATE;
  const [selectedTransport, setSelectedTransport] = useState("WebRTC");

  return (
    <div>
      <div className="flex items-end justify-between p-2">
        <div>Transport</div>
        <InfoTooltip variant="icon">Something something very cool</InfoTooltip>
      </div>
      <div className="flex flex-col gap-4 rounded-md bg-[#F4F5F6] p-2">
        <div className="flex items-center justify-between">
          <div>Protocol</div>
          <Select
            options={transportOptions.map((option) => [option, option])}
            value={selectedTransport}
            onChange={(value) =>
              setSelectedTransport(value as (typeof transportOptions)[number])
            }
          />
        </div>
        {/* <div>
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
        </div> */}
      </div>
    </div>
  );
};
