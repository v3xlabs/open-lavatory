import { ConnectionPreferences } from "./ConnectionPreferences";
import { SignalingSettings } from "./Signaling";
import { TransportSettings } from "./Transport";

export interface ModalSettingsProps {
  onBack: () => void;
  continueLabel: string;
}

export const ModalSettings = ({
  onBack,
  continueLabel,
}: ModalSettingsProps) => (
  <div className="text-left">
    <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto px-2">
      <SignalingSettings />
      <TransportSettings />
      <ConnectionPreferences />
    </div>
    <div className="mt-3 shrink-0 px-2 pt-1">
      <button
        type="button"
        className="w-full rounded-xl bg-blue-500 px-6 py-3 font-semibold text-sm text-white transition hover:bg-blue-600"
        onClick={onBack}
      >
        {continueLabel}
      </button>
    </div>
  </div>
);
