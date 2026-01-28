import z from "zod";

export const SignalingSettingsV0Schema = z.object({
  p: z.string(),
  s: z.string(),
});

export type SignalingSettingsV0 = z.infer<typeof SignalingSettingsV0Schema>;
export const SignalingSettingsV1Schema = z.object({
  p: z.string(),
  s: z.record(z.string(), z.string()),
});

export type SignalingSettingsV1 = z.infer<typeof SignalingSettingsV1Schema>;

export type SignalingSettings = SignalingSettingsV1;

const convertSignalingSettingsV0ToV1 = (
  settings: SignalingSettingsV0,
): SignalingSettingsV1 => {
  return {
    p: settings.p,
    s: { [settings.p]: settings.s },
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
  // transport: TransportSettingsSchema,
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

export const TransportSettingsV0Schema = z.object({
  protocol: z.string(),
  iceServers: z
    .object({
      stun: z.string().optional(),
      turn: z.string().optional(),
    })
    .optional(),
});

export type TransportSettingsV0 = z.infer<typeof TransportSettingsV0Schema>;

export const ProviderStorageV3Schema = z.object({
  version: z.literal(3),
  retainHistory: z.boolean(),
  autoReconnect: z.boolean(),
  signaling: SignalingSettingsV1Schema,
  language: z.string().optional(),
  transport: TransportSettingsV0Schema.optional(),
});

export type ProviderStorageV3 = z.infer<typeof ProviderStorageV3Schema>;

export const TurnServerSchema = z.object({
  urls: z.string(),
  username: z.string().optional(),
  credential: z.string().optional(),
});

export type TurnServer = z.infer<typeof TurnServerSchema>;

export const TransportSettingsSchema = z.object({
  protocol: z.string(),
  iceServers: z
    .object({
      stun: z.array(z.string()).optional(),
      turn: z.array(TurnServerSchema).optional(),
    })
    .optional(),
});

export type TransportSettings = z.infer<typeof TransportSettingsSchema>;

export const ProviderStorageV4Schema = z.object({
  version: z.literal(4),
  retainHistory: z.boolean(),
  autoReconnect: z.boolean(),
  signaling: SignalingSettingsV1Schema,
  language: z.string().optional(),
  transport: TransportSettingsSchema.optional(),
});

export type ProviderStorageV4 = z.infer<typeof ProviderStorageV4Schema>;

export type ProviderStorage = ProviderStorageV4;

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
): ProviderStorageV2 => {
  return {
    version: 2,
    retainHistory: settings.retainHistory,
    autoReconnect: settings.autoReconnect,
    signaling: settings.signaling,
    language: undefined,
  };
};

export const convertProviderStorageV2ToV3 = (
  settings: ProviderStorageV2,
): ProviderStorageV3 => {
  return {
    version: 3,
    retainHistory: settings.retainHistory,
    autoReconnect: settings.autoReconnect,
    signaling: settings.signaling,
    language: settings.language,
    transport: {
      protocol: "webrtc",
    },
  };
};

export const convertProviderStorageV3ToV4 = (
  settings: ProviderStorageV3,
): ProviderStorageV4 => {
  const oldIce = settings.transport?.iceServers;

  return {
    version: 4,
    retainHistory: settings.retainHistory,
    autoReconnect: settings.autoReconnect,
    signaling: settings.signaling,
    language: settings.language,
    transport: {
      protocol: settings.transport?.protocol ?? "webrtc",
      iceServers: oldIce
        ? {
            stun: oldIce.stun ? [oldIce.stun] : undefined,
            turn: oldIce.turn ? [{ urls: oldIce.turn }] : undefined,
          }
        : undefined,
    },
  };
};

export const AnyStorage = z.discriminatedUnion("version", [
  ProviderStorageV0Schema.transform((v) => ({ version: 0, ...v })),
  ProviderStorageV1Schema,
  ProviderStorageV2Schema,
  ProviderStorageV3Schema,
  ProviderStorageV4Schema,
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
    return migrateStorageToLatest(
      convertProviderStorageV2ToV3(storage as ProviderStorageV2),
    );
  }

  if (storage.version === 3) {
    return convertProviderStorageV3ToV4(storage as ProviderStorageV3);
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
