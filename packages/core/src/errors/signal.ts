import { BaseError, type BaseErrorParameters } from "./base.js";

export class SignalError extends BaseError {
  override name = "SignalError";
  constructor(
    shortMessage: string,
    args: Omit<BaseErrorParameters, "name"> = {},
  ) {
    super(shortMessage, args);
  }
}

export class SignalNoConnectionError extends SignalError {
  override name = "SignalNoConnectionError";
  constructor() {
    super("No signaling connection is available.");
  }
}

export class SignalConnectionLostError extends SignalError {
  override name = "SignalConnectionLostError";
  constructor(args: { url?: string; cause?: Error; } = {}) {
    super("Signaling relay connection was lost.", {
      cause: args.cause,
      metaMessages: args.url ? [`Relay URL: ${args.url}`] : undefined,
    });
  }
}

export class SignalRetryExhaustedError extends SignalError {
  override name = "SignalRetryExhaustedError";
  constructor(args: { url?: string; cause?: Error; } = {}) {
    super("Signaling connection retries exhausted.", {
      cause: args.cause,
      metaMessages: args.url ? [`Relay URL: ${args.url}`] : undefined,
    });
  }
}

export class SignalPublishError extends SignalError {
  override name = "SignalPublishError";
  constructor(args: { url?: string; cause?: Error; } = {}) {
    super("Failed to publish signaling message.", {
      cause: args.cause,
      metaMessages: args.url ? [`Relay URL: ${args.url}`] : undefined,
    });
  }
}

export class SignalTeardownError extends SignalError {
  override name = "SignalTeardownError";
  constructor(args: { url?: string; } = {}) {
    super("Signaling connection was torn down.", {
      metaMessages: args.url ? [`Relay URL: ${args.url}`] : undefined,
    });
  }
}

export class SignalHandshakeError extends SignalError {
  override name = "SignalHandshakeError";
  constructor(args: { cause?: Error; } = {}) {
    super("Signaling handshake failed.", { cause: args.cause });
  }
}

export class SignalDecryptionError extends SignalError {
  override name = "SignalDecryptionError";
  constructor(args: { cause?: Error; } = {}) {
    super("Failed to decrypt incoming signaling message.", {
      cause: args.cause,
    });
  }
}
