import { ConnectionPreferences } from "./ConnectionPreferences";
import { SignalingSettings } from "./Signaling";
import { TransportSettings } from "./Transport";

export interface ModalSettingsProps {
  onBack: () => void;
}

export const ModalSettings = ({ onBack }: ModalSettingsProps) => (
  <div className="text-left">
    <div className="flex flex-col gap-2 px-2">
      <div>These settings are mock for now.</div>
      <SignalingSettings />
      <TransportSettings />
      <ConnectionPreferences />
    </div>
  </div>
);
