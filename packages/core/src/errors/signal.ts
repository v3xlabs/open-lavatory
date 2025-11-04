import { BaseError } from "./base.js";

export class SignalNoConnectionError extends BaseError {
  constructor() {
    super(["Hello", "World"].join("\n"), { name: "SignalConnectionError" });
  }
}
