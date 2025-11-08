import type { ProviderStorage } from "./version";

export const DEFAULT_SETTINGS: ProviderStorage = {
  version: 1,
  signaling: {
    p: "mqtt",
    s: {
      mqtt: "wss://test.mosquitto.org:8081/mqtt",
      ntfy: "https://ntfy.sh",
      gun: "wss://try.axe.eco/gun",
    },
  },
  autoReconnect: false,
  retainHistory: false,
};
