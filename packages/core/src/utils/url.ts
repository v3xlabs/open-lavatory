import type { SessionHandshakeParameters } from "../session.js";

export const encodeConnectionURL = (payload: SessionHandshakeParameters) => {
  const params = new URLSearchParams();

  params.set("h", payload.h);
  params.set("k", payload.k);

  if (payload.p) {
    params.set("p", payload.p);
  }

  if (payload.s) {
    params.set("s", payload.s);
  }

  return `openlv://${payload.sessionId}?${params.toString()}`;
};

export const decodeConnectionURL = (
  url: string,
): SessionHandshakeParameters => {
  // Type check and validation
  if (typeof url !== "string") {
    throw new Error(`Invalid URL type: expected string, got ${typeof url}`);
  }

  if (!url || url.trim() === "") {
    throw new Error("URL cannot be empty");
  }

  if (!url.startsWith("openlv://")) {
    throw new Error(
      `Invalid URL format: must start with 'openlv://', got: ${url}`,
    );
  }

  try {
    const urlObj = new URL(url);
    const sessionId = urlObj.hostname || urlObj.pathname.replace("/", "");
    const h = urlObj.searchParams.get("h") || "";
    const k = urlObj.searchParams.get("k") || "";
    const s = urlObj.searchParams.get("s") || undefined;
    const p =
      (urlObj.searchParams.get("p") as "mqtt" | "waku" | "nostr") || "mqtt";

    if (!sessionId) {
      throw new Error("Session ID is required in URL");
    }

    // Validate session ID format (16 characters, URL-safe alphabet)
    if (!/^[A-Za-z0-9_-]{16}$/.test(sessionId)) {
      throw new Error(
        "Invalid session ID format: must be 16 URL-safe characters",
      );
    }

    if (!h) {
      throw new Error("Public key hash (h parameter) is required in URL");
    }

    // Validate public key hash format (16 hex characters)
    if (!/^[0-9a-f]{16}$/.test(h)) {
      throw new Error(
        "Invalid public key hash format: must be 16 hex characters",
      );
    }

    if (!k) {
      throw new Error("Shared key (k parameter) is required in URL");
    }

    // Validate shared key format (32 hex characters)
    if (!/^[0-9a-f]{32}$/.test(k)) {
      throw new Error(
        `Invalid shared key format: must be 32 hex characters, received: ${k}`,
      );
    }

    return {
      sessionId,
      h,
      k,
      // TODO: figure out why '' empty string and not undefined
      s: s ? decodeURIComponent(s) : "",
      p,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    throw new Error(
      `Failed to parse URL: ${url}. Original error: ${errorMessage}`,
    );
  }
};
