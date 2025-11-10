import { decodeConnectionURL, encodeConnectionURL } from "@openlv/core";
import { ntfy } from "@openlv/signaling/ntfy";
import { describe, expect, test } from "vitest";

import { connectSession, createSession } from "./base.js";

describe("Session", () => {
  test("Should be able to create a session", async () => {
    const sessionA = await createSession(
      {
        sessionId: "mytestsession111",
        p: "ntfy",
        s: "https://ntfy.sh/",
      },
      ntfy,
      async (message) => {
        console.log("sessionA received message", message);

        return { result: "success" };
      },
    );

    expect(sessionA).toBeDefined();
    console.log(sessionA.getState());

    await sessionA.connect();

    const handshakeParametersA = sessionA.getHandshakeParameters();
    const encodedUrl = encodeConnectionURL(handshakeParametersA);

    console.log(encodedUrl);

    const decodedUrl = decodeConnectionURL(encodedUrl);

    expect(decodedUrl).toEqual(handshakeParametersA);

    //
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("Connecting to session B");

    const sessionB = await connectSession(encodedUrl, async (message) => {
      console.log("sessionB received message", message);

      return { result: "success" };
    });

    console.log(sessionB.getState());
    await sessionB.connect();

    await Promise.all([sessionA.waitForLink(), sessionB.waitForLink()]);

    //
    console.log("A", sessionA.getState());
    console.log("B", sessionB.getState());

    const response = await sessionA.send({ data: "test" });

    console.log("response", response);

    expect(response).toEqual({ result: "success" });
  });
});
