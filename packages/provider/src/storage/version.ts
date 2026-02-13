import z from "zod";

// Signaling protocol types
export const SignalingProtocol = z.enum(["mqtt", "ntfy", "gun"]);
export type SignalingProtocol = z.infer<typeof SignalingProtocol>;

export const SignalingSettingsV0Schema = z.object({
  p: z.string(),
  s: z.string(),
});

export type SignalingSettingsV0 = z.infer<typeof SignalingSettingsV0Schema>;

export const SignalingSettingsV1Schema = z.object({
  p: SignalingProtocol,
  s: z
    .object({
      mqtt: z.string(),
      ntfy: z.string(),
      gun: z.string(),
    })
    .partial(),
});

export type SignalingSettingsV1 = z.infer<typeof SignalingSettingsV1Schema>;

export type SignalingSettings = SignalingSettingsV1;

export const UserThemePreferenceSchema = z.enum(["light", "dark", "system"]);
export type UserThemePreference = z.infer<typeof UserThemePreferenceSchema>;

const convertSignalingSettingsV0ToV1 = (
  settings: SignalingSettingsV0,
): SignalingSettingsV1 => {
  const protocol = SignalingProtocol.parse(settings.p);

  return {
    p: protocol,
    s: { [protocol]: settings.s },
  };
};

export const ProviderStorageV0Schema = z.object({
  version: z.literal(0).optional(),
  retainHistory: z.boolean(),
  autoReconnect: z.boolean(),
  session: SignalingSettingsV0Schema,
});

export type ProviderStorageV0 = z.infer<typeof ProviderStorageV0Schema>;

export const ProviderStorageV1Schema = z.object({
  version: z.literal(1),
  retainHistory: z.boolean(),
  autoReconnect: z.boolean(),
  signaling: SignalingSettingsV1Schema,
});

export type ProviderStorageV1 = z.infer<typeof ProviderStorageV1Schema>;

export const ProviderStorageV2Schema = z.object({
  version: z.literal(2),
  retainHistory: z.boolean(),
  autoReconnect: z.boolean(),
  signaling: SignalingSettingsV1Schema,
  language: z.string().optional(),
});

export type ProviderStorageV2 = z.infer<typeof ProviderStorageV2Schema>;

// TURN server configuration
export const TurnServerSchema = z.object({
  urls: z.string(),
  username: z.string().optional(),
  credential: z.string().optional(),
});

export type TurnServer = z.infer<typeof TurnServerSchema>;

// WebRTC-specific settings
export const WebRTCSettingsSchema = z.object({
  stun: z.array(z.string()).optional(),
  turn: z.array(TurnServerSchema).optional(),
});

export type WebRTCSettings = z.infer<typeof WebRTCSettingsSchema>;

// Transport settings with protocol-specific configurations
export const TransportSettingsSchema = z.object({
  p: z.string(),
  s: z
    .object({
      webrtc: WebRTCSettingsSchema.optional(),
    })
    .optional(),
});

export type TransportSettings = z.infer<typeof TransportSettingsSchema>;

export const ProviderStorageV3Schema = z.object({
  version: z.literal(3),
  retainHistory: z.boolean(),
  autoReconnect: z.boolean(),
  signaling: SignalingSettingsV1Schema.optional(),
  language: z.string().optional(),
  transport: TransportSettingsSchema.optional(),
  theme: UserThemePreferenceSchema.optional(),
});

export type ProviderStorageV3 = z.infer<typeof ProviderStorageV3Schema>;

export type ProviderStorage = ProviderStorageV3;

export const convertProviderStorageV0ToV1 = (
  settings: ProviderStorageV0,
): ProviderStorageV1 => {
  console.log("convertProviderStorageV0ToV1", settings);

  return {
    version: 1,
    retainHistory: settings.retainHistory,
    autoReconnect: settings.autoReconnect,
    signaling: convertSignalingSettingsV0ToV1(settings.session),
  };
};

export const convertProviderStorageV1ToV2 = (
  settings: ProviderStorageV1,
): ProviderStorageV2 => ({
  version: 2,
  retainHistory: settings.retainHistory,
  autoReconnect: settings.autoReconnect,
  signaling: settings.signaling,
  language: undefined,
});

export const convertProviderStorageV2ToV3 = (
  settings: ProviderStorageV2,
): ProviderStorageV3 => ({
  version: 3,
  retainHistory: settings.retainHistory,
  autoReconnect: settings.autoReconnect,
  signaling: settings.signaling,
  language: settings.language,
  transport: undefined,
  theme: undefined,
});

export const AnyStorage = z.discriminatedUnion("version", [
  ProviderStorageV0Schema.transform(v => ({ version: 0, ...v })),
  ProviderStorageV1Schema,
  ProviderStorageV2Schema,
  ProviderStorageV3Schema,
]);

export type ProviderStorageVAny = z.infer<typeof AnyStorage>;

export const migrateStorageToLatest = (
  storage: ProviderStorageVAny,
): ProviderStorage => {
  console.log("migrateStorageToLatest", storage);

  if (storage.version === 0 || storage.version === undefined) {
    return migrateStorageToLatest(
      convertProviderStorageV0ToV1(storage as ProviderStorageV0),
    );
  }

  if (storage.version === 1) {
    return migrateStorageToLatest(
      convertProviderStorageV1ToV2(storage as ProviderStorageV1),
    );
  }

  if (storage.version === 2) {
    return convertProviderStorageV2ToV3(storage as ProviderStorageV2);
  }

  return storage as ProviderStorage;
};

/**
 * Parses raw input string (from localStorage, etc.) into a ProviderStorage object.
 * Auto upgrades from old storage versions to new ones.
 */
export const parseProviderStorage = (raw: string): ProviderStorage => {
  const storage = AnyStorage.parse(JSON.parse(raw));

  const migrated = migrateStorageToLatest(storage) as ProviderStorage;

  return migrated;
};
