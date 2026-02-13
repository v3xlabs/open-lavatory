export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);

      return true;
    }
  }
  catch {}

  try {
    const textArea = document.createElement("textarea");

    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.append(textArea);
    textArea.focus();
    textArea.select();
    const result = document.execCommand("copy");

    textArea.remove();

    return result;
  }
  catch {
    return false;
  }
};
