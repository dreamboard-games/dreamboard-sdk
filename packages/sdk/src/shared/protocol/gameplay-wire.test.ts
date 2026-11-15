import { expect, test } from "vitest";
import {
  AuthConnectFrameSchema,
  AuthAcceptedFrameSchema,
  GAMEPLAY_WIRE_PROTOCOL_VERSION,
  AuthRefreshFrameSchema,
} from "./gameplay-wire.js";

test("room guest credentials authenticate and refresh without transporting recovery cookies", () => {
  const credential = { kind: "room-guest", token: "short-lived-credential" };
  expect(
    AuthConnectFrameSchema.parse({
      type: "auth.connect",
      protocolVersion: GAMEPLAY_WIRE_PROTOCOL_VERSION,
      sessionId: "00000000-0000-4000-8000-000000000001",
      playerId: "player-2",
      credential,
    }).credential,
  ).toEqual(credential);
  expect(
    AuthRefreshFrameSchema.parse({ type: "auth.refresh", credential })
      .credential,
  ).toEqual(credential);
  expect(
    AuthRefreshFrameSchema.safeParse({
      type: "auth.refresh",
      credential: { ...credential, secret: "recovery-secret" },
    }).success,
  ).toBe(false);
});

test("hosted handshakes require the current independent wire version", () => {
  for (const protocolVersion of [undefined, 1, 3]) {
    expect(
      AuthConnectFrameSchema.safeParse({
        type: "auth.connect",
        protocolVersion,
        sessionId: "00000000-0000-4000-8000-000000000001",
        playerId: "alice",
        credential: { kind: "demo", secret: "fixture" },
      }).success,
    ).toBe(false);
    expect(
      AuthAcceptedFrameSchema.safeParse({
        type: "auth.accepted",
        protocolVersion,
        expiresAt: "2099-01-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
  }
});
