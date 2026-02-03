export const addToHistory = (history: string[], newUrl: string): string[] => {
  const trimmedUrl = newUrl.trim();

  if (!trimmedUrl) {
    return history;
  }

  const filtered = history.filter((url) => url !== trimmedUrl);

  const updated = [trimmedUrl, ...filtered];

  return updated.slice(0, 3);
};

export const removeFromHistory = (
  history: string[],
  urlToRemove: string,
): string[] => {
  return history.filter((url) => url !== urlToRemove);
};
