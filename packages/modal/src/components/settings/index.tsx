import { ConnectionPreferences } from "./ConnectionPreferences.js";
import { SignalingSettings } from "./Signaling.js";
import { ThemeSettings } from "./ThemeSettings.js";
import { TransportSettings } from "./Transport.js";

export const ModalSettings = () => (
  <div className="px-4 pb-2">
    <ThemeSettings />
    <SignalingSettings />
    <TransportSettings />
    <ConnectionPreferences />
  </div>
);
