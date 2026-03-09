import { BaseError, type BaseErrorParameters } from "./base.js";

export class SessionError extends BaseError {
  override name = "SessionError";
  constructor(
    shortMessage: string,
    args: Omit<BaseErrorParameters, "name"> = {},
  ) {
    super(shortMessage, args);
  }
}

export class SessionNotReadyError extends SessionError {
  override name = "SessionNotReadyError";
  constructor() {
    super(
      "Session is not ready to send messages. Handshake has not completed.",
    );
  }
}

export class SessionTimeoutError extends SessionError {
  override name = "SessionTimeoutError";
  constructor(args: { timeout?: number; } = {}) {
    super("Session request timed out.", {
      metaMessages:
        args.timeout === undefined ? undefined : [`Timeout: ${args.timeout}ms`],
    });
  }
}

export class SessionSetupError extends SessionError {
  override name = "SessionSetupError";
  constructor(args: { cause?: Error; } = {}) {
    super("Failed to set up the session.", { cause: args.cause });
  }
}
