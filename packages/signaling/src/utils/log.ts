export const log = (...x: Parameters<typeof console.log>) =>
  console.log(
    "%c[signaling]%c",
    "color: blue; font-weight: bold",
    "color: inherit; font-weight: normal",
    ...x,
  );
