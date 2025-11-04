export const toBase64 = (data: Uint8Array): string => {
  let binary = "";

  for (let index = 0; index < data.length; index += 1) {
    binary += String.fromCharCode(data[index]);
  }

  return btoa(binary);
};

export const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};
