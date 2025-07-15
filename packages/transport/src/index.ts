/**
 * Open Lavatory Protocol - Decentralized Wallet Connection Library
 *
 * A privacy-first, peer-to-peer protocol for connecting dApps with wallets
 * without relying on centralized infrastructure.
 */

// Main connection class
export { OpenLVConnection } from './connection.js';

// URL utilities
export { decodeConnectionURL, encodeConnectionURL } from './connection.js';

// Types
export type {
    ConnectionEvents,
    ConnectionPayload,
    ConnectionPhase,
    ConnectionState,
    DAppInfo,
    ErrorHandler,
    EthereumMethod,
    EthereumRequest,
    JsonRpcError,
    JsonRpcRequest,
    JsonRpcResponse,
    MessageHandler,
    PhaseHandler,
    SessionConfig,
    WalletInfo,
} from './types.js';

// Utilities (for advanced usage)
export type { SignalingConfig, SignalingMessage } from './signaling/mqtt.js';
export { MQTTSignaling } from './signaling/mqtt.js';
export { EncryptionUtils } from './utils/encryption.js';
