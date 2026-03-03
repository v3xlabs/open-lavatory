import type {
  ProviderStorage,
  TurnServer,
  UserThemePreference,
} from "@openlv/provider/storage";

import { useModalContext } from "../context.js";
import type { LanguageTag } from "../utils/i18n.js";

export const useSettings = () => {
  const { provider, settings, setSettings } = useModalContext();

  const persistSettings = (newSettings: ProviderStorage) => {
    setSettings(newSettings);
    provider.storage.setSettings(newSettings);
  };

  const updateSignalingProtocol = (update: string) => {
    const currentSettings = settings();

    if (!currentSettings.signaling) return;

    if (currentSettings.signaling.p === update) return;

    persistSettings({
      ...currentSettings,
      signaling: {
        ...currentSettings.signaling,
        p: update as ProviderStorage["signaling"] extends { p: infer P; }
          ? P
          : never,
      },
    });
  };

  const updateSignalingServer = (server: string) => {
    const currentSettings = settings();

    if (!currentSettings.signaling) return;

    if (currentSettings.signaling.s[currentSettings.signaling.p] === server)
      return;

    persistSettings({
      ...currentSettings,
      signaling: {
        ...currentSettings.signaling,
        s: {
          ...currentSettings.signaling.s,
          [currentSettings.signaling.p]: server,
        },
      },
    });
  };

  const updateRetainHistory = (retainHistory: boolean) => {
    const currentSettings = settings();

    persistSettings({ ...currentSettings, retainHistory });
  };

  const updateAutoReconnect = (autoReconnect: boolean) => {
    const currentSettings = settings();

    persistSettings({ ...currentSettings, autoReconnect });
  };

  const updateThemePreference = (theme: UserThemePreference) => {
    const currentSettings = settings();

    if (currentSettings.theme === theme) return;

    persistSettings({ ...currentSettings, theme });
  };

  const updateLanguage = (language: LanguageTag) => {
    const currentSettings = settings();

    persistSettings({ ...currentSettings, language });
  };

  const updateTransportProtocol = (protocol: string) => {
    const currentSettings = settings();

    if (currentSettings.transport?.p === protocol) return;

    persistSettings({
      ...currentSettings,
      transport: {
        ...currentSettings.transport,
        p: protocol,
      },
    });
  };

  // Helper to update WebRTC settings cleanly
  const updateWebRTCSettings = (
    updater: (
      current: NonNullable<
        NonNullable<ProviderStorage["transport"]>["s"]
      >["webrtc"],
    ) => NonNullable<NonNullable<ProviderStorage["transport"]>["s"]>["webrtc"],
  ) => {
    const currentSettings = settings();

    const currentWebRTC = currentSettings.transport?.s?.webrtc;
    const newWebRTC = updater(currentWebRTC);

    persistSettings({
      ...currentSettings,
      transport: {
        p: currentSettings.transport?.p ?? "webrtc",
        s: {
          ...currentSettings.transport?.s,
          webrtc: newWebRTC,
        },
      },
    });
  };

  // STUN server reducers
  const addStunServer = (url: string) => {
    updateWebRTCSettings(current => ({
      ...current,
      stun: [...(current?.stun ?? []), url],
    }));
  };

  const removeStunServer = (index: number) => {
    updateWebRTCSettings((current) => {
      const newStun = current?.stun?.filter((_, i) => i !== index);

      return {
        ...current,
        stun: newStun?.length ? newStun : undefined,
      };
    });
  };

  const updateStunServer = (index: number, url: string) => {
    updateWebRTCSettings((current) => {
      const newStun = [...(current?.stun ?? [])];

      newStun[index] = url;

      return {
        ...current,
        stun: newStun,
      };
    });
  };

  // TURN server reducers
  const addTurnServer = (server: TurnServer) => {
    updateWebRTCSettings(current => ({
      ...current,
      turn: [...(current?.turn ?? []), server],
    }));
  };

  const removeTurnServer = (index: number) => {
    updateWebRTCSettings((current) => {
      const newTurn = current?.turn?.filter((_, i) => i !== index);

      return {
        ...current,
        turn: newTurn?.length ? newTurn : undefined,
      };
    });
  };

  const updateTurnServer = (index: number, updates: Partial<TurnServer>) => {
    updateWebRTCSettings((current) => {
      const newTurn = [...(current?.turn ?? [])];

      newTurn[index] = { ...newTurn[index], ...updates };

      return {
        ...current,
        turn: newTurn,
      };
    });
  };

  return {
    settings,
    updateSignalingProtocol,
    updateSignalingServer,
    updateRetainHistory,
    updateAutoReconnect,
    updateThemePreference,
    updateLanguage,
    updateTransportProtocol,
    // STUN reducers
    addStunServer,
    removeStunServer,
    updateStunServer,
    // TURN reducers
    addTurnServer,
    removeTurnServer,
    updateTurnServer,
  };
};
