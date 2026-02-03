import type { ProviderStorage, TurnServer } from "@openlv/provider/storage";
import { useState } from "preact/hooks";

import type { LanguageTag } from "../utils/i18n.js";
import { useEventEmitter } from "./useEventEmitter.js";
import { useProvider } from "./useProvider.js";

export const useSettings = () => {
  const { provider } = useProvider();
  const [settings, setSettings] = useState<ProviderStorage | undefined>(
    provider?.storage.getSettings(),
  );

  useEventEmitter(
    provider?.storage.emitter,
    "settings_change",
    (newSettings) => {
      setSettings(newSettings);
    },
  );

  const persistSettings = (newSettings: ProviderStorage) => {
    setSettings(newSettings);
    provider?.storage.setSettings(newSettings);
  };

  const updateSignalingProtocol = (update: string) => {
    if (!settings?.signaling) return;
    if (settings.signaling.p === update) return;

    persistSettings({
      ...settings,
      signaling: {
        ...settings.signaling,
        p: update as ProviderStorage["signaling"] extends { p: infer P }
          ? P
          : never,
      },
    });
  };

  const updateSignalingServer = (server: string) => {
    if (!settings?.signaling) return;
    if (settings.signaling.s[settings.signaling.p] === server) return;

    persistSettings({
      ...settings,
      signaling: {
        ...settings.signaling,
        s: {
          ...settings.signaling.s,
          [settings.signaling.p]: server,
        },
      },
    });
  };

  const updateRetainHistory = (retainHistory: boolean) => {
    if (!settings) return;
    persistSettings({ ...settings, retainHistory });
  };

  const updateAutoReconnect = (autoReconnect: boolean) => {
    if (!settings) return;
    persistSettings({ ...settings, autoReconnect });
  };

  const updateThemePreference = (theme: UserThemePreference) => {
    if (!settings) return;

    if (settings.theme === theme) return;

    setSettings({ ...settings, theme });
    provider?.storage.setSettings({ ...settings, theme });
  };

  const updateLanguage = (language: LanguageTag) => {
    if (!settings) return;
    persistSettings({ ...settings, language });
  };

  const updateTransportProtocol = (protocol: string) => {
    if (!settings) return;
    if (settings.transport?.p === protocol) return;

    persistSettings({
      ...settings,
      transport: {
        ...settings.transport,
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
    ) => NonNullable<
      NonNullable<ProviderStorage["transport"]>["s"]
    >["webrtc"],
  ) => {
    if (!settings) return;

    const currentWebRTC = settings.transport?.s?.webrtc;
    const newWebRTC = updater(currentWebRTC);

    persistSettings({
      ...settings,
      transport: {
        p: settings.transport?.p ?? "webrtc",
        s: {
          ...settings.transport?.s,
          webrtc: newWebRTC,
        },
      },
    });
  };

  // STUN server reducers
  const addStunServer = (url: string) => {
    updateWebRTCSettings((current) => ({
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
    updateWebRTCSettings((current) => ({
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

  if (!settings) throw new Error("Settings not found");

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
