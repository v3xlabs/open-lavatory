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

export interface ConnectorModalInterface {
  // Methods the modal can call on the connector
  startConnection: () => Promise<void>;
  retryConnection: () => Promise<void>;
  closeConnection: () => void;

  // Events the connector can emit to the modal
  onConnectionStateChange: (info: ConnectionInfo) => void;
}
