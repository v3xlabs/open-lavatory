/**
 * Open Lavatory Protocol - Decentralized Wallet Connection Library
 *
 * A privacy-first, peer-to-peer protocol for connecting dApps with wallets
 * without relying on centralized infrastructure.
 */

export * from "./base.js";

// Types
export type {
  ConnectionEvents,
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
} from "./types.js";
