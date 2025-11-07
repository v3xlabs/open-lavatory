/** biome-ignore-all lint/performance/noBarrelFile: package entrypoint */

/**
 * Open Lavatory Protocol - Decentralized Wallet Connection Library
 *
 * A privacy-first, peer-to-peer protocol for connecting dApps with wallets
 * without relying on centralized infrastructure.
 */

// biome-ignore lint/performance/noReExportAll: package entrypoint
export * from "./base.js";

// Types
export type { Session, SessionStateObject } from "./session-types.js";
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
