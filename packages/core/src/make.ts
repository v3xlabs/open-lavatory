type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

type Merge<T extends readonly object[]> = UnionToIntersection<T[number]>;

type EnsureAssignable<Have, Want> = Have extends Want ? unknown : never; // if not assignable -> return type becomes never

export function combine<Target extends object, Parts extends readonly object[]>(
  ...parts: Parts
): EnsureAssignable<Merge<Parts>, Target> extends unknown ? Target : never {
  // runtime: left-to-right shallow assign
  return Object.assign({}, ...parts) as any;
}

export const make = <M extends object, O extends object>(e: M, o: O) => {
  return Object.assign(e, o) as M & O;
};
