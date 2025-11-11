import { ConnectionPreferences } from "./ConnectionPreferences.js";
import { SignalingSettings } from "./Signaling.js";
import { TransportSettings } from "./Transport.js";

export const ModalSettings = () => (
  <div className="px-4 pb-2">
    <SignalingSettings />
    <TransportSettings />
    <ConnectionPreferences />
  </div>
);
