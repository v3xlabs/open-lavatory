import { match } from "ts-pattern";
import z from "zod";

export type SignalingSettingsV0 = {
  // Currently selected protocol
  p: string;
  // Server URL
  s: string;
};

export const SignalingSettingsV0Schema = z.object({
  p: z.string(),
  s: z.string(),
});

export type SignalingSettingsV1 = {
  // Currently selected protocol
  p: string;
  // Server URLs for each protocol (protocol -> url)
  s: Record<string, string>;
};

export type SignalingSettings = SignalingSettingsV1;

export const SignalingSettingsV1Schema = z.object({
  p: z.string(),
  s: z.record(z.string(), z.string()),
});

const convertSignalingSettingsV0ToV1 = (
  settings: SignalingSettingsV0,
): SignalingSettingsV1 => {
  return {
    p: settings.p,
    s: { [settings.p]: settings.s },
  };
};

export type ProviderStorageV0 = {
  version?: 0;
  retainHistory: boolean;
  autoReconnect: boolean;
  session: SignalingSettingsV0;
};

export const ProviderStorageV0Schema = z.object({
  version: z.literal(0).optional(),
  retainHistory: z.boolean(),
  autoReconnect: z.boolean(),
  session: SignalingSettingsV0Schema,
});

export type ProviderStorageV1 = {
  version: 1;
  retainHistory: boolean;
  autoReconnect: boolean;
  signaling: SignalingSettingsV1;
  // transport: TransportSettings;
};

export const ProviderStorageV1Schema = z.object({
  version: z.literal(1),
  retainHistory: z.boolean(),
  autoReconnect: z.boolean(),
  signaling: SignalingSettingsV1Schema,
  // transport: TransportSettingsSchema,
});

export type ProviderStorage = ProviderStorageV1;

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

export const AnyStorage = z.discriminatedUnion("version", [
  ProviderStorageV0Schema.transform((v) => ({ version: 0, ...v })),
  ProviderStorageV1Schema,
]);

export type ProviderStorageVAny = z.infer<typeof AnyStorage>;

export const migrateStorageToLatest = (
  storage: ProviderStorageVAny,
): z.infer<typeof AnyStorage> => {
  console.log("migrateStorageToLatest", storage);

  return (
    match(storage)
      .with({ version: 0 }, (v) =>
        migrateStorageToLatest(convertProviderStorageV0ToV1(v)),
      )
      // .with({ version: 1 }, (v) => v)
      .otherwise((s) => s)
  );
};

/**
 * Parses raw input string (from localStorage, etc.) into a ProviderStorage object.
 * Auto upgrades from old storage versions to new ones.
 */
export const parseProviderStorage = (raw: string): ProviderStorage => {
  console.log("parseProviderStorage", raw);
  const storage = AnyStorage.parse(JSON.parse(raw));

  console.log("storage", storage);

  const migrated = migrateStorageToLatest(storage) as ProviderStorage;

  console.log("migrated", migrated);

  return migrated;
};
