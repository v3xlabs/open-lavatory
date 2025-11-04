export const log = (...x: Parameters<typeof console.log>) =>
  console.log(
    "%c[signaling]%c",
    "color: lightblue; font-weight: bold",
    "color: inherit; font-weight: normal",
    ...x,
  );
