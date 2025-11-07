import { ConnectionPreferences } from "./ConnectionPreferences";
import { SignalingSettings } from "./Signaling";
import { TransportSettings } from "./Transport";

export const ModalSettings = () => (
  <div className="px-4 pb-2">
    <SignalingSettings />
    <TransportSettings />
    <ConnectionPreferences />
  </div>
);
