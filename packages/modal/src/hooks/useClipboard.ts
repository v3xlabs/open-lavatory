export const copyToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false;

    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);

            return true;
        }
    } catch (_error) {
    }

    try {
        const textArea = document.createElement('textarea');

        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');

        document.body.removeChild(textArea);

        return result;
    } catch (_fallbackError) {

        return false;
    }
};
