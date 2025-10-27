import type { OpenLVProvider } from '@openlv/provider';
import { h, render } from 'preact';

import { ModalRoot, type ModalRootProps } from './components/ModalRoot';
import { getDefaultModalPreferences, type ModalPreferences } from './preferences';
import { ensureStyles } from './styles';
import type { ConnectionInfo, ModalConnectionInterface } from './types/connection';

export interface OpenLVModalElementProps extends Omit<ModalRootProps, 'onClose'> {
    onClose?: () => void;
}

const attributeNameMap: Record<string, keyof OpenLVModalElementProps> = {
    uri: 'uri',
    title: 'title',
    subtitle: 'subtitle',
    'continue-label': 'continueLabel',
};

export class OpenLVModalElement
    extends HTMLElement
    implements OpenLVModalElementProps, ModalConnectionInterface {
    public uri: string = '';
    public title: string = '';
    public subtitle?: string;
    public continueLabel?: string;
    public initialPreferences?: ModalPreferences;
    public onPreferencesChange?: (preferences: ModalPreferences) => void;
    public onClose?: () => void;
    public connectionInfo?: ConnectionInfo;
    public onStartConnection?: () => void;
    public onCopy?: (uri: string) => void;
    public provider: OpenLVProvider;

    private readonly shadow: ShadowRoot;
    private renderRequested = false;

    constructor(_provider: OpenLVProvider) {
        super();
        this.provider = _provider;
        this.shadow = this.attachShadow({ mode: 'open' });
        ensureStyles(this.shadow);
    }

    static get observedAttributes(): string[] {
        return Object.keys(attributeNameMap);
    }

    connectedCallback() {
        this.requestRender();
    }

    disconnectedCallback() {
        render(null, this.shadow);
    }

    attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
        const propName = attributeNameMap[name];

        if (!propName) {
            return;
        }

        (this as Record<string, unknown>)[propName] = newValue ?? undefined;
        this.requestRender();
    }

    setProps(uri: string) {
        this.uri = uri;
        this.requestRender();
    }

    // ModalConnectionInterface implementation
    updateConnectionState(info: ConnectionInfo) {
        this.connectionInfo = info;
        this.requestRender();
    }

    showModal() {
        this.style.display = 'block';
    }

    hideModal() {
        this.style.display = 'none';
    }

    update(props: Partial<OpenLVModalElementProps>) {
        Object.assign(this, props);
        this.requestRender();
    }

    set preferences(prefs: ModalPreferences | undefined) {
        this.initialPreferences = prefs ? { ...getDefaultModalPreferences(), ...prefs } : undefined;
        this.requestRender();
    }

    private requestRender() {
        if (this.renderRequested) {
            return;
        }

        this.renderRequested = true;
        queueMicrotask(() => {
            this.renderRequested = false;
            this.performRender();
        });
    }

    private performRender() {
        const props: ModalRootProps = {
            uri: this.uri ?? '',
            title: this.title,
            subtitle: this.subtitle,
            continueLabel: this.continueLabel,
            initialPreferences: this.initialPreferences ?? getDefaultModalPreferences(),
            onPreferencesChange: this.onPreferencesChange,
            onClose: this.onClose ?? (() => this.remove()),
            connectionInfo: this.connectionInfo,
            onStartConnection: this.onStartConnection,
            getProvider: () => this.provider,
            onCopy: this.onCopy,
        };

        render(h(ModalRoot, props), this.shadow);
    }
}

// eslint-disable-next-line import/no-default-export
export default OpenLVModalElement;
