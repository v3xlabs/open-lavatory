export const copyToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false;

    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);

            return true;
        }
    } catch (error) {
        console.warn('OpenLV modal: Clipboard API failed, falling back', error);
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
    } catch (fallbackError) {
        console.error('OpenLV modal: fallback copy failed', fallbackError);

        return false;
    }
};
