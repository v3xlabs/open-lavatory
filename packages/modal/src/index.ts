/** biome-ignore-all lint/performance/noBarrelFile: package entrypoint */
/** biome-ignore-all lint/performance/noReExportAll: package entrypoint */
/** biome-ignore-all lint/suspicious/noConsole: temp */

export type { ModalRootProps } from './components/ModalRoot';
export { ModalRoot } from './components/ModalRoot';
export { useConnectionState } from './hooks/useConnectionState';
export { OpenLVModalElement } from './openlv-modal-element';
export type {
    ConnectionInfo,
    ConnectorModalInterface,
    ModalConnectionInterface,
} from './types/connection';

import type { OpenLVProvider } from '../../provider/src';
import OpenLVModalElementDefault from './openlv-modal-element';
import { log } from './utils/log';
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
            log('modal closed');
            x.remove();
        };
    }
};
