import { ConnectionPreferences } from "./ConnectionPreferences";
import { SignalingSettings } from "./Signaling";
import { TransportSettings } from "./Transport";

export const ModalSettings = () => (
  <div className="text-left">
    <div className="flex flex-col gap-2 px-2">
      <SignalingSettings />
      <TransportSettings />
      <ConnectionPreferences />
    </div>
  </div>
);
