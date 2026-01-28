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

export type ProviderStorage = ProviderStorageV2;

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

export const AnyStorage = z.discriminatedUnion("version", [
  ProviderStorageV0Schema.transform((v) => ({ version: 0, ...v })),
  ProviderStorageV1Schema,
  ProviderStorageV2Schema,
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
    return convertProviderStorageV1ToV2(storage as ProviderStorageV1);
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
