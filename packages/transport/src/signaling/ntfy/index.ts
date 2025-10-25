import { SignalBaseProperties } from '../base.js';
import { createSignalingLayer, SignalLayerCreator } from '../index.js';
import { parseNtfyUrl } from './url.js';

export type NtfyMessage = {
    id: string;
    time: number;
    expires: number;
    event: string;
    topic: string;
    message: string;
};

/**
 * Signaling over NTFY
 *
 * Uses HTTP Post for publishing
 * Uses WebSocket for subscribing
 *
 * URL format supports the ?auth= parameter
 * example: https://ntfy.sh/mytopic?auth=mytoken
 *
 * The same goes for apprise ntfy urls
 * example: ntfy://{token}@{hostname}/{topic}
 * example: ntfy://{user}:{password}@{hostname}/{topic}
 * https variant: ntfys://{user}:{password}@{hostname}/{topic}
 *
 */
export const ntfy: SignalLayerCreator = ({ topic, url }: SignalBaseProperties) => {
    let connection: WebSocket | null = null;
    const connectionInfo = parseNtfyUrl(url);
    const wsProtocol =
        connectionInfo.protocol === 'https'
            ? 'wss'
            : connectionInfo.protocol === 'http'
              ? 'ws'
              : connectionInfo.protocol;

    return createSignalingLayer({
        type: 'ntfy',
        async setup() {
            console.log('NTFY: Setting up');

            const wsUrl =
                wsProtocol +
                '://' +
                connectionInfo.host +
                '/' +
                topic +
                '/ws' +
                (connectionInfo.parameters || '');

            console.log('NTFY: Connecting to WebSocket', wsUrl);
            connection = new WebSocket(wsUrl);

            connection.onerror = (event) => {
                console.error('NTFY: Error on WebSocket', event);
            };

            connection.onclose = (event) => {
                console.error('NTFY: Closed WebSocket', event);
            };

            const awaitOpenConfirm = new Promise<void>((resolve) => {
                connection!.onmessage = (event) => {
                    console.log('NTFY: Received message:', event.data);
                    const data = JSON.parse(event.data) as NtfyMessage;

                    if (data.event == 'open') {
                        resolve();
                    }
                };
            });

            const awaitOpen = new Promise<void>((resolve) => {
                connection!.onopen = () => {
                    console.log('NTFY: Connected to WebSocket');
                    resolve();
                };
            });

            await awaitOpen;
            await awaitOpenConfirm;
        },
        teardown() {
            connection?.close();
        },
        async publish(body) {
            const headers = { 'Content-Type': 'application/json' } as HeadersInit;

            // TODO: Add response handling
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars
            const response = await fetch(
                connectionInfo.protocol + '://' + connectionInfo.host + '/' + topic,
                { method: 'POST', body, headers }
            );
        },
        async subscribe(handler) {
            if (!connection) {
                console.error('NTFY: No connection to subscribe to');

                return;
            }

            connection.onmessage = (event) => {
                console.log('NTFY: Received message:', event.data);
                const data = JSON.parse(event.data) as NtfyMessage;

                console.log('NTFY: Message:', data);

                if (data.event !== 'message') {
                    console.log('NTFY: Not a message event', data.event);

                    return;
                }

                handler(data.message);
            };
        },
    });
};

Object.defineProperty(ntfy, '__name', { value: 'ntfy' });
