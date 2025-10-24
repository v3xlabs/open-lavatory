import { ConnectionPayload } from '../types.js';

export const encodeConnectionURL = (payload: ConnectionPayload) => {
    const params = new URLSearchParams();

    params.set('h', payload.pubkeyHash);
    params.set('k', payload.sharedKey);

    if (payload.server) {
        params.set('s', payload.server);
    }

    if (payload.protocol && payload.protocol !== 'mqtt') {
        params.set('p', payload.protocol);
    }

    return `openlv://${payload.sessionId}?${params.toString()}`;
};

export const decodeConnectionURL = (url: string): ConnectionPayload => {
    // Type check and validation
    if (typeof url !== 'string') {
        throw new Error(`Invalid URL type: expected string, got ${typeof url}`);
    }

    if (!url || url.trim() === '') {
        throw new Error('URL cannot be empty');
    }

    if (!url.startsWith('openlv://')) {
        throw new Error(`Invalid URL format: must start with 'openlv://', got: ${url}`);
    }

    try {
        const urlObj = new URL(url);
        const sessionId = urlObj.hostname || urlObj.pathname.replace('/', '');
        const pubkeyHash = urlObj.searchParams.get('h') || '';
        const sharedKey = urlObj.searchParams.get('k') || '';
        const server = urlObj.searchParams.get('s') || undefined;
        const protocol = (urlObj.searchParams.get('p') as 'mqtt' | 'waku' | 'nostr') || 'mqtt';

        if (!sessionId) {
            throw new Error('Session ID is required in URL');
        }

        // Validate session ID format (16 characters, URL-safe alphabet)
        if (!/^[A-Za-z0-9_-]{16}$/.test(sessionId)) {
            throw new Error('Invalid session ID format: must be 16 URL-safe characters');
        }

        if (!pubkeyHash) {
            throw new Error('Public key hash (h parameter) is required in URL');
        }

        // Validate public key hash format (16 hex characters)
        if (!/^[0-9a-f]{16}$/.test(pubkeyHash)) {
            throw new Error('Invalid public key hash format: must be 16 hex characters');
        }

        if (!sharedKey) {
            throw new Error('Shared key (k parameter) is required in URL');
        }

        // Validate shared key format (64 hex characters)
        if (!/^[0-9a-f]{64}$/.test(sharedKey)) {
            throw new Error('Invalid shared key format: must be 64 hex characters');
        }

        return {
            sessionId,
            pubkeyHash,
            sharedKey,
            server: server ? decodeURIComponent(server) : undefined,
            protocol,
        };
    } catch (error) {
        // If it's already our custom error, re-throw it
        if (error instanceof Error && error.message.includes('required')) {
            throw error;
        }

        // Fallback to legacy regex parsing
        try {
            const legacyMatch = url.match(/openlv:\/\/([^?]+)\?(?:sharedKey|k|h)=([^&]+)/) ?? [];
            const [, sessionId, keyOrHash] = legacyMatch;

            if (!sessionId || !keyOrHash) {
                throw new Error(
                    `Invalid URL format: could not parse session ID or key from ${url}`
                );
            }

            return {
                sessionId,
                pubkeyHash: keyOrHash, // Assume it's pubkeyHash for legacy
                sharedKey: keyOrHash, // Use same value for both in legacy mode
            };
        } catch {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            throw new Error(`Failed to parse URL: ${url}. Original error: ${errorMessage}`);
        }
    }
};
