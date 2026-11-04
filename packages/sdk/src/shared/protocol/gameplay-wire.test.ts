import { expect, test } from "vitest";
import {
  AuthConnectFrameSchema,
  AuthRefreshFrameSchema,
} from "./gameplay-wire.js";

test("room guest credentials authenticate and refresh without transporting recovery cookies", () => {
  const credential = { kind: "room-guest", token: "short-lived-credential" };
  expect(
    AuthConnectFrameSchema.parse({
      type: "auth.connect",
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
