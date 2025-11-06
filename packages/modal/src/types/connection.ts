export type ConnectionState =
  | "idle"
  | "initializing"
  | "connecting"
  | "qr-ready"
  | "connected"
  | "error"
  | "disconnected";

export interface ConnectionInfo {
  state: ConnectionState;
  uri?: string;
  error?: string;
  connectedAccount?: string;
  chainId?: number;
}

export interface ModalConnectionInterface {
  // Methods the connector can call on the modal
  showModal: () => void;
  hideModal: () => void;

  // Events the modal can emit to the connector
  onClose?: () => void;
}
