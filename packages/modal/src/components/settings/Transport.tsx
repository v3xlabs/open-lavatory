import classNames from "classnames";
import { useState } from "preact/hooks";

import { InfoTooltip } from "../ui/InfoTooltip";
import { InputGroup } from "../ui/Input";

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
          <div className="flex divide-x overflow-hidden rounded-md border border-gray-300">
            {transportOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSelectedTransport(option)}
                aria-pressed={selectedTransport === option}
                className={classNames(
                  "px-4 py-2 font-semibold text-xs transition",
                  selectedTransport === option
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "cursor-pointer border-gray-300 text-gray-600 hover:border-gray-400",
                )}
              >
                {option}
              </button>
            ))}
          </div>
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
