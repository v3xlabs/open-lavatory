import { BaseError, type BaseErrorParameters } from "./base.js";

export class TransportError extends BaseError {
  override name = "TransportError";
  constructor(
    shortMessage: string,
    args: Omit<BaseErrorParameters, "name"> = {},
  ) {
    super(shortMessage, args);
  }
}

export class TransportNotConnectedError extends TransportError {
  override name = "TransportNotConnectedError";
  constructor() {
    super("Transport is not connected.");
  }
}

export class TransportConnectionFailedError extends TransportError {
  override name = "TransportConnectionFailedError";
  constructor(args: { state?: string; cause?: Error; } = {}) {
    super("Transport connection failed.", {
      cause: args.cause,
      metaMessages: args.state
        ? [`Connection state: ${args.state}`]
        : undefined,
    });
  }
}

export class TransportDecryptionError extends TransportError {
  override name = "TransportDecryptionError";
  constructor(args: { cause?: Error; } = {}) {
    super("Failed to decrypt incoming transport message.", {
      cause: args.cause,
    });
  }
}
