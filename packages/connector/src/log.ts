export const log = (...x: Parameters<typeof console.log>) =>
  console.log(
    "%c[connector]%c",
    "color: cyan; font-weight: bold",
    "color: inherit; font-weight: normal",
    ...x,
  );
