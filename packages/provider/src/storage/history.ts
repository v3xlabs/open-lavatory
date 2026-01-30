export type HistoryOptions = {
  maxItems?: number;
};

export const addToHistory = (
  history: string[],
  newUrl: string,
  options: HistoryOptions = {},
): string[] => {
  const { maxItems = 3 } = options;

  const trimmedUrl = newUrl.trim();

  if (!trimmedUrl) {
    return history;
  }

  const filtered = history.filter((url) => url !== trimmedUrl);

  const updated = [trimmedUrl, ...filtered];

  return updated.slice(0, maxItems);
};

export const getHistoryForProtocol = (
  lastUsed: Record<string, string[]> | undefined,
  protocol: string,
): string[] => {
  if (!lastUsed) {
    return [];
  }

  return lastUsed[protocol] || [];
};
