type UnionToIntersection<U> = (
  U extends unknown
    ? (k: U) => void
    : never
) extends (k: infer I) => void
  ? I
  : never;

type Merge<T extends readonly object[]> = UnionToIntersection<T[number]>;

type EnsureAssignable<Have, Want> = Have extends Want ? unknown : never; // if not assignable -> return type becomes never

export const combine = <Target extends object, Parts extends readonly object[]>(
  ...parts: Parts
): EnsureAssignable<Merge<Parts>, Target> extends unknown ? Target : never =>
// runtime: left-to-right shallow assign
  Object.assign({}, ...parts) as EnsureAssignable<
    Merge<Parts>,
    Target
  > extends unknown
    ? Target
    : never;

export const make = <M extends object, O extends object>(e: M, o: O) =>
  Object.assign(e, o) as M & O;
