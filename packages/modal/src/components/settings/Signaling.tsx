import { useSettings } from "../../hooks/useSettings";
import { InfoTooltip } from "../ui/InfoTooltip";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

type SignalingProtocol = "MQTT" | "NTFY" | "GUN";

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
