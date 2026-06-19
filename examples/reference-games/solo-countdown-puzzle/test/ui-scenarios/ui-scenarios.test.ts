import assert from "node:assert/strict";
import test from "node:test";
import { repairBeaconMobileScenario } from "./repair-beacon.mobile.scenario.ts";
import { reconnectMobileScenario } from "./reconnect.mobile.scenario.ts";

test("UI scenarios cover repair and reconnect mobile evidence", () => {
  assert.equal(
    repairBeaconMobileScenario.id,
    "solo-countdown-puzzle.repair-beacon.mobile",
  );
  assert.equal(repairBeaconMobileScenario.replay[0]?.inputKey, "beaconId");
  assert.equal(repairBeaconMobileScenario.replay[0]?.spaceId, "beacon-north");
  assert.equal(
    reconnectMobileScenario.id,
    "solo-countdown-puzzle.reconnect.mobile",
  );
  assert.deepEqual(reconnectMobileScenario.environment.browsers, [
    "chromium",
    "webkit",
  ]);
});
