export const PROVIDER_STATUS = {
  STANDBY: "standby",
  DISCONNECTED: "disconnected",
  CREATING: "creating",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error",
} as const;

export type ProviderStatus =
  (typeof PROVIDER_STATUS)[keyof typeof PROVIDER_STATUS];
