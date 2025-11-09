export const log = (...x: Parameters<typeof console.log>) =>
  console.log(
    // "%c[transport]%c",
    // "color: orange; font-weight: bold",
    // "color: inherit; font-weight: normal",
    ...x,
  );
