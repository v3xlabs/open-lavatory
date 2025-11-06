import { useSettings } from "../../hooks/useSettings";
import { InfoTooltip } from "../ui/InfoTooltip";
import { Input, InputGroup } from "../ui/Input";
import { Select } from "../ui/Select";

type SignalingProtocol = "MQTT" | "NTFY" | "GUN";

const SIGNALING_TEMPLATE = {
  MQTT: {
    presets: ["Local dev", "Production", "Experimental"],
    serverUrls: ["mqtt://broker.example"],
    clientId: "openlv-client",
    topic: "openlv/session",
  },
  NTFY: {
    serverUrl: "https://ntfy.example",
    topics: ["openlv-notify"],
    accessToken: "ntfy-token",
  },
  GUN: {
    peers: ["https://gun-us.example/gun"],
    soul: "openlv#session",
  },
} as const;

const protocolOptions: SignalingProtocol[] = ["MQTT", "NTFY", "GUN"];

export const SignalingSettings = () => {
  const { settings, updateSettings } = useSettings();

  const setProtocol = (protocol: string) =>
    updateSettings({ session: { p: protocol } });

  const setServer = (server: string) =>
    updateSettings({ session: { s: server } });

  return (
    <div>
      <div className="flex items-end justify-between p-2">
        <div>Signaling</div>
        <InfoTooltip variant="icon">Something something very cool</InfoTooltip>
      </div>
      <div className="flex flex-col gap-4 rounded-md bg-[#F4F5F6] p-2">
        <div className="flex items-center justify-between">
          <div>Protocol</div>
          <Select
            options={protocolOptions.map((option) => [
              option.toLowerCase(),
              option,
            ])}
            value={settings?.session.p || ""}
            onChange={setProtocol}
          />
        </div>
        <Input
          id="server"
          value={settings?.session.s || ""}
          onChange={(value) => setServer(value)}
          placeholder="Server URL"
          ariaLabel="Server URL"
          readOnly={false}
        />
      </div>
    </div>
  );
};

const MqttSettings = () => {
  const settings = SIGNALING_TEMPLATE.MQTT;

  return (
    <div className="grid gap-4">
      <InputGroup
        label="Presets"
        values={settings.presets}
        placeholder="Preset name"
      />
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
      <InputGroup
        label="Topics"
        values={settings.topics}
        placeholder="openlv-notify"
      />
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
