import * as QRCode from 'qrcode-generator';

export const getModalTemplate = (qrSvg: string, uri: string): string => `
    <style>
        :host {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .modal-content {
            background: white;
            border-radius: 16px;
            padding: 32px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .modal-title {
            margin: 0 0 16px 0;
            font-size: 24px;
            color: #1f2937;
            font-weight: 600;
        }

        .modal-subtitle {
            margin: 0 0 24px 0;
            color: #6b7280;
            font-size: 14px;
        }

        .qr-container {
            margin: 24px 0;
            padding: 16px;
            background: #f9fafb;
            border-radius: 12px;
        }

        .qr-wrapper {
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0 auto;
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            width: fit-content;
            cursor: pointer;
            overflow: hidden;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .qr-wrapper:hover {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .qr-code {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 200px;
            height: 200px;
            transition: filter 0.4s ease;
            filter: blur(8px);
        }

        .qr-wrapper:hover .qr-code {
            filter: blur(0px);
        }

        .qr-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.85);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            transition: opacity 0.4s ease;
            pointer-events: none;
            border-radius: 6px;
        }

        .qr-wrapper:hover .qr-overlay {
            opacity: 0;
        }

        .overlay-text-primary {
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin: 0 0 4px 0;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .overlay-text-secondary {
            font-size: 12px;
            color: #6b7280;
            margin: 0;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .privacy-icon {
            font-size: 20px;
            margin-bottom: 8px;
            opacity: 0.7;
        }

        .url-container {
            background: #f3f4f6;
            border-radius: 8px;
            padding: 12px;
            margin: 16px 0;
            cursor: pointer;
            transition: background-color 0.2s ease, box-shadow 0.2s ease;
        }

        .url-container:hover {
            background: #e5e7eb;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .url-label {
            margin: 0 0 8px 0;
            font-size: 12px;
            color: #374151;
            font-weight: 600;
        }

        .url-text {
            margin: 0;
            font-size: 10px;
            color: #6b7280;
            word-break: break-all;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        }

        .cancel-button {
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 14px;
            cursor: pointer;
            font-weight: 500;
            transition: background-color 0.2s ease;
        }

        .cancel-button:hover {
            background: #dc2626;
        }

        .protocol-badge {
            margin: 16px 0 0 0;
            font-size: 12px;
            color: #9ca3af;
        }

        .interaction-hint {
            margin: 8px 0 0 0;
            font-size: 11px;
            color: #9ca3af;
            font-style: italic;
        }

        .copy-feedback {
            position: absolute;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            z-index: 10001;
            opacity: 0;
        }

        .copy-feedback.show {
            transform: translateX(0);
            opacity: 1;
        }
    </style>
    
    <div class="modal-content">
        <h2 class="modal-title">Connect OpenLV Wallet</h2>
        <p class="modal-subtitle">Scan QR code or copy URL to connect</p>
        
        <div class="qr-container">
            <div class="qr-wrapper" id="qr-wrapper" title="Click to copy connection URL">
                <div class="qr-code">${qrSvg}</div>
                <div class="qr-overlay">
                    <div class="privacy-icon">🔒</div>
                    <p class="overlay-text-primary">Hover to reveal</p>
                    <p class="overlay-text-secondary">Hidden for privacy</p>
                </div>
            </div>
            <p class="interaction-hint">QR code is blurred for privacy protection • Click to copy URL</p>
        </div>
        
        <div class="url-container" id="url-container" title="Click to copy connection URL">
            <p class="url-label">Connection URL:</p>
            <p class="url-text">${uri}</p>
        </div>
        
        <button class="cancel-button" id="cancel-btn">Cancel</button>
        
        <p class="protocol-badge">🔐 OpenLV Protocol</p>
        
        <div class="copy-feedback" id="copy-feedback">
            📋 Connection URL copied to clipboard!
        </div>
    </div>
`;

// Lightweight QR Modal Web Component
export class OpenLVModalElement extends HTMLElement {
    public shadowRoot: ShadowRoot;
    private uri: string = '';
    private onClose: () => void = () => {};
    private keydownHandler?: (e: KeyboardEvent) => void;

    constructor() {
        super();
        this.shadowRoot = this.attachShadow({ mode: 'closed' });
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    disconnectedCallback() {
        // Clean up event listeners when element is removed
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
    }

    setProps(uri: string, onClose: () => void) {
        this.uri = uri;
        this.onClose = onClose;
        if (this.isConnected) {
            this.render();
        }
    }

    private generateQRCode(text: string): string {
        const qr = QRCode.default(0, 'M');
        qr.addData(text);
        qr.make();
        return qr.createSvgTag({cellSize: 5, margin: 0, scalable: true});
    }

    private render() {
        const qrSvg = this.generateQRCode(this.uri);
        this.shadowRoot.innerHTML = getModalTemplate(qrSvg, this.uri);
    }

    private async copyToClipboard(text: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(text);
            this.showCopyFeedback();
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                this.showCopyFeedback();
            } catch (err) {
                console.error('Failed to copy to clipboard:', err);
            }
            
            document.body.removeChild(textArea);
        }
    }

    private showCopyFeedback(): void {
        const feedback = this.shadowRoot.querySelector('#copy-feedback') as HTMLElement;
        if (feedback) {
            feedback.classList.add('show');
            setTimeout(() => {
                if (feedback) {
                    feedback.classList.remove('show');
                }
            }, 2000);
        }
    }

    private setupEventListeners() {
        // Close on backdrop click (but not on modal content)
        this.addEventListener('click', (e) => {
            if (e.target === this) {
                this.onClose();
            }
        });

        // Copy URL when clicking QR code
        const qrWrapper = this.shadowRoot.querySelector('#qr-wrapper');
        qrWrapper?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyToClipboard(this.uri);
        });

        // Copy URL when clicking URL container
        const urlContainer = this.shadowRoot.querySelector('#url-container');
        urlContainer?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyToClipboard(this.uri);
        });

        // Close on cancel button
        const cancelBtn = this.shadowRoot.querySelector('#cancel-btn');
        cancelBtn?.addEventListener('click', () => {
            this.onClose();
        });

        // Close on Escape key
        this.keydownHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                this.onClose();
            }
        };
        document.addEventListener('keydown', this.keydownHandler);
    }
}

// Register the custom element
if (!customElements.get('openlv-modal')) {
    customElements.define('openlv-modal', OpenLVModalElement);
} 