// utils/assign.ts

/** Make intersection shapes readable in tooltips */
type Simplify<T> = { [K in keyof T]: T[K] } & {};

/** Right-most wins for overlapping keys */
type Overwrite<L, R> = Omit<L, keyof R> & R;

/** Merge a tuple of objects so later entries overwrite earlier ones */
type MergeRight<T extends readonly unknown[]> = T extends []
  ? {}
  : T extends [infer A]
    ? A
    : T extends [infer A extends object, ...infer R extends object[]]
      ? Overwrite<Simplify<A>, Simplify<MergeRight<R>>>
      : never;

/**
 * Object.assign but fully typed. Creates a new object.
 * Later sources overwrite earlier ones in both runtime and type.
 */
export function merge<T extends readonly object[]>(
  ...sources: T
): Simplify<MergeRight<T>> {
  // Shallow merge, same semantics as Object.assign({}, ...sources)
  return Object.assign({}, ...sources) as Simplify<MergeRight<T>>;
}
