type PlainObject = Record<string, unknown>;

const isPlainObject = (val: unknown): val is PlainObject =>
  typeof val === "object" && val !== null && !Array.isArray(val);

export const deepMerge = <T extends PlainObject>(
  target: T,
  source: Partial<T>,
): T =>
  Object.entries(source).reduce(
    (acc, [key, val]) => ({
      ...acc,
      [key]:
        isPlainObject(acc[key]) && isPlainObject(val)
          ? deepMerge(acc[key], val as Partial<(typeof acc)[typeof key]>)
          : val,
    }),
    { ...target },
  );

export const getNested = (obj: unknown, path: string): unknown =>
  path
    .split(".")
    .reduce((curr, key) => (isPlainObject(curr) ? curr[key] : undefined), obj);

export const setNested = (
  obj: PlainObject,
  path: string,
  value: unknown,
): PlainObject => {
  const [head, ...rest] = path.split(".");

  if (rest.length === 0) return { ...obj, [head]: value };

  const child = obj[head];

  return {
    ...obj,
    [head]: setNested(isPlainObject(child) ? child : {}, rest.join("."), value),
  };
};

export const deepDiff = (
  current: PlainObject,
  base: PlainObject,
): PlainObject =>
  Object.entries(current).reduce((diff, [key, val]) => {
    const baseVal = base[key];

    if (val === baseVal) return diff;

    if (isPlainObject(val) && isPlainObject(baseVal)) {
      const nested = deepDiff(val, baseVal);

      return Object.keys(nested).length > 0 ? { ...diff, [key]: nested } : diff;
    }

    return { ...diff, [key]: val };
  }, {} as PlainObject);

export const dedup = (map: PlainObject): PlainObject => {
  const light = map.light as PlainObject | undefined;
  const dark = map.dark as PlainObject | undefined;

  if (!light || !dark) return map;

  const common: PlainObject = {};
  const lightOnly: PlainObject = {};
  const darkOnly: PlainObject = {};

  for (const key of new Set([...Object.keys(light), ...Object.keys(dark)])) {
    const lVal = light[key];
    const dVal = dark[key];

    if (
      key in light
      && key in dark
      && JSON.stringify(lVal) === JSON.stringify(dVal)
    ) {
      common[key] = lVal;
    }
    else {
      if (key in light) lightOnly[key] = lVal;

      if (key in dark) darkOnly[key] = dVal;
    }
  }

  if (Object.keys(common).length === 0) return map;

  return {
    ...(map.common
      ? { common: { ...(map.common as PlainObject), ...common } }
      : { common }),
    ...(Object.keys(lightOnly).length > 0 && { light: lightOnly }),
    ...(Object.keys(darkOnly).length > 0 && { dark: darkOnly }),
  };
};
