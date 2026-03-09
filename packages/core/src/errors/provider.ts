import { BaseError, type BaseErrorParameters } from "./base.js";

export class ProviderError extends BaseError {
  override name = "ProviderError";
  constructor(
    shortMessage: string,
    args: Omit<BaseErrorParameters, "name"> = {},
  ) {
    super(shortMessage, args);
  }
}

export class ProviderNoSessionError extends ProviderError {
  override name = "ProviderNoSessionError";
  constructor() {
    super("No active session. Connect to a wallet first.");
  }
}

export class ProviderStorageError extends ProviderError {
  override name = "ProviderStorageError";
  constructor(args: { cause?: Error; } = {}) {
    super("Failed to parse or migrate provider storage.", {
      cause: args.cause,
    });
  }
}
