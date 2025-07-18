/**
 * Open Lavatory Protocol Types
 * Includes JSON-RPC types for Ethereum wallet connectivity
 */

// Connection states for the Open Lavatory protocol
export type ConnectionState =
    | 'disconnected'
    | 'mqtt-connecting'
    | 'mqtt-connected'
    | 'pairing'
    | 'key-exchange'
    | 'webrtc-negotiating'
    | 'webrtc-connected';

export type ConnectionPhase = {
    state: ConnectionState;
    description: string;
    timestamp: number;
};

export type SessionConfig = {
    mqttUrl?: string;
    protocol?: 'mqtt' | 'waku' | 'nostr';
};

export type ConnectionPayload = {
    sessionId: string; // 16-character URL-safe random string
    pubkeyHash: string; // Hash of PeerA's public key for verification (16 hex chars)
    sharedKey: string; // Shared key for symmetric encryption during handshake (64 hex chars)
    server?: string;
    protocol?: 'mqtt' | 'waku' | 'nostr';
};

// JSON-RPC 2.0 types for Ethereum wallet connectivity
export interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    params?: any[];
}

export interface JsonRpcResponse {
    jsonrpc: '2.0';
    id: string | number;
    result?: any;
    error?: JsonRpcError;
}

export interface JsonRpcError {
    code: number;
    message: string;
    data?: any;
}

// Ethereum JSON-RPC method types
export type EthereumMethod =
    | 'eth_requestAccounts'
    | 'eth_accounts'
    | 'eth_chainId'
    | 'eth_getBalance'
    | 'eth_blockNumber'
    | 'eth_sendTransaction'
    | 'eth_signTransaction'
    | 'eth_sign'
    | 'personal_sign'
    | 'eth_signTypedData'
    | 'eth_signTypedData_v3'
    | 'eth_signTypedData_v4'
    | 'wallet_switchEthereumChain'
    | 'wallet_addEthereumChain';

export interface EthereumRequest extends JsonRpcRequest {
    method: EthereumMethod;
}

export interface EthereumResponse extends JsonRpcResponse {}

// Wallet info for connection handshake
export interface WalletInfo {
    name: string;
    version: string;
    icon?: string;
}

export interface DAppInfo {
    name: string;
    url: string;
    icon?: string;
}

// Event handlers
export type MessageHandler = (request: JsonRpcRequest) => Promise<any> | any;
export type PhaseHandler = (phase: ConnectionPhase) => void;
export type ErrorHandler = (error: Error) => void;

// Connection events
export interface ConnectionEvents {
    onPhaseChange?: PhaseHandler;
    onMessage?: MessageHandler;
    onError?: ErrorHandler;
    onConnect?: () => void;
    onDisconnect?: () => void;
}
