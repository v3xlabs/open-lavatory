/** biome-ignore-all lint/performance/noBarrelFile: package entrypoint */
/** biome-ignore-all lint/performance/noReExportAll: package entrypoint */
/** biome-ignore-all lint/suspicious/noConsole: temp */

export type { ModalRootProps } from './components/ModalRoot';
export { ModalRoot } from './components/ModalRoot';
export { useConnectionState } from './hooks/useConnectionState';
export type { OpenLVModalElementProps } from './openlv-modal-element';
export { OpenLVModalElement } from './openlv-modal-element';
export type { ModalPreferences } from './preferences';
export { getDefaultModalPreferences } from './preferences';
export type {
    ConnectionInfo,
    ConnectorModalInterface,
    ModalConnectionInterface,
} from './types/connection';
import { encodeConnectionURL } from '@openlv/core';

import type { OpenLVProvider } from '../../provider/src';
import OpenLVModalElementDefault from './openlv-modal-element';
export { OPENLV_ICON_128 } from './assets/logo';

export const registerOpenLVModal = (tagName = 'openlv-modal') => {
    if (typeof window === 'undefined') {
        return tagName;
    }

    const registry = window.customElements;

    if (!registry) {
        console.warn('OpenLV modal: custom elements are not supported in this environment.');

        return tagName;
    }

    if (!registry.get(tagName)) {
        registry.define(tagName, OpenLVModalElementDefault as unknown as CustomElementConstructor);
    }

    return tagName;
};

// eslint-disable-next-line import/no-default-export
export default OpenLVModalElementDefault;

export const triggerOpenModal = (provider: OpenLVProvider) => {
    const modal = document.querySelector('openlv-modal');

    if (modal) modal.remove();

    if (!modal) {
        registerOpenLVModal();
        const x = new OpenLVModalElementDefault(provider);

        document.body.appendChild(x);
        x.showModal();
        x.onClose = () => {
            console.log('modal closed');
            x.remove();
        };
        x.onStartConnection = async () => {
            x.updateConnectionState({ state: 'initializing' });

            console.log('modal start connection');
            const session = await provider.createSession();

            console.log('session state:', session.getState());
            const params = session.getHandshakeParameters();
            const url = encodeConnectionURL(params);

            console.log('url:', url);

            x.setProps(url);

            x.updateConnectionState({ state: 'qr-ready', uri: url });
        };
    }
};
