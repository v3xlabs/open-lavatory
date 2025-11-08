// Utility: deep partial for nested structures
export type PartialDeep<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<PartialDeep<U>>
    : T[K] extends object
      ? PartialDeep<T[K]>
      : T[K];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

/**
 * Deeply merges `patch` into `base`, but only for keys that already exist in `base`.
 * - Objects: recurse
 * - Arrays: replaced wholesale when provided in `patch`
 * - Scalars/Dates/etc.: replaced when provided in `patch`
 * - Patch keys not in `base`: ignored
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export function deepMerge<T>(base: T, patch: PartialDeep<T> | undefined): T {
  if (patch === undefined) return base;

  // Arrays: replace if patch is an array, otherwise keep base
  if (Array.isArray(base)) {
    if (Array.isArray(patch)) {
      // Return a shallow copy to keep immutability
      return patch.slice() as unknown as T;
    }

    return base;
  }

  // Plain objects: merge only existing keys
  if (isPlainObject(base)) {
    const result: Record<string, unknown> = {
      ...(base as Record<string, unknown>),
    };

    // Only iterate over base keys to avoid introducing new ones
    for (const key of Object.keys(base as Record<string, unknown>)) {
      const bVal = (base as Record<string, unknown>)[key];

      // Only consider the patch value if the key exists on patch
      if (
        isPlainObject(patch) &&
        Object.prototype.hasOwnProperty.call(patch, key)
      ) {
        const pVal = (patch as Record<string, unknown>)[key];

        if (pVal === undefined) {
          // undefined means "no change"
          result[key] = bVal;
        } else {
          result[key] = deepMerge(bVal as unknown as T, pVal as PartialDeep<T>);
        }
      } else {
        result[key] = bVal;
      }
    }

    return result as T;
  }

  // Non-object scalars or special objects (Date, Map, etc.): replace when patch provided
  return patch as T;
}
