import assert from "node:assert/strict";
import test from "node:test";
import reducerBundle from "../../app/index.ts";
import {
  claimCargoForPublicState,
  cooperativeOutcome,
  createInitialPublicState,
  eventProcedureIds,
  resolveRivalProcedure,
} from "../../app/game.ts";
import { createEmptyTable } from "../../shared/manifest-contract.ts";
import type { PublicState } from "../../app/game-contract.ts";

const expectedProcedures = [
  "rival-instruction-revealed",
  "rival-cargo-claimed",
  "river-refilled",
  "river-round-advanced",
];

test("claim cargo resolves deterministic rival procedure and system events", () => {
  const initial = createInitialPublicState();
  const result = claimCargoForPublicState({
    publicState: initial,
    playerId: "player-1",
    claimId: "claim-1",
  });

  assert.equal(result.accepted, true);
  if (!result.accepted) return;
  assert.equal(result.publicState.teamScore, 2);
  assert.equal(result.publicState.rivalProgress, 3);
  assert.equal(
    result.publicState.river.some((card) => card.id === "grain-3-1"),
    false,
  );
  assert.deepEqual(eventProcedureIds(result.events), expectedProcedures);
});

test("duplicate claim id returns the committed events without changing state", () => {
  const first = claimCargoForPublicState({
    publicState: createInitialPublicState(),
    playerId: "player-1",
    claimId: "same-claim",
  });
  assert.equal(first.accepted, true);
  if (!first.accepted) return;

  const second = claimCargoForPublicState({
    publicState: first.publicState,
    playerId: "player-1",
    claimId: "same-claim",
  });
  assert.equal(second.accepted, true);
  if (!second.accepted) return;
  assert.equal(second.duplicate, true);
  assert.deepEqual(second.publicState, first.publicState);
  assert.deepEqual(second.events, first.events);
});

test("seed repeat produces identical rival events", () => {
  const left = claimCargoForPublicState({
    publicState: createInitialPublicState(),
    playerId: "player-1",
    claimId: "seed-a",
  });
  const right = claimCargoForPublicState({
    publicState: createInitialPublicState(),
    playerId: "player-1",
    claimId: "seed-b",
  });
  assert.equal(left.accepted, true);
  assert.equal(right.accepted, true);
  if (!left.accepted || !right.accepted) return;
  assert.deepEqual(left.events, right.events);
  assert.deepEqual(left.publicState.river, right.publicState.river);
});

test("unauthorized actor is rejected without creating a rival seat", () => {
  const result = claimCargoForPublicState({
    publicState: createInitialPublicState(),
    playerId: "bot",
    claimId: "bot-claim",
  });
  assert.equal(result.accepted, false);
  if (result.accepted) return;
  assert.equal(result.errorCode, "PLAYER_NOT_AUTHORIZED");
});

test("reconnect view can be reconstructed from public event history", () => {
  const first = claimCargoForPublicState({
    publicState: createInitialPublicState(),
    playerId: "player-1",
    claimId: "reconnect-1",
  });
  assert.equal(first.accepted, true);
  if (!first.accepted) return;
  const restored = structuredClone(first.publicState);
  assert.deepEqual(eventProcedureIds(restored.eventLog), expectedProcedures);
  assert.equal(restored.rivalProgress, first.publicState.rivalProgress);
  assert.equal(restored.processedClaims["reconnect-1"]?.eventCount, 4);
});

test("claim-kind fallback and sweep-left branches resolve against ordinary river state", () => {
  const afterHighest = resolveRivalProcedure(
    createInitialPublicState(),
  ).publicState;
  const afterClaimKind = resolveRivalProcedure(afterHighest).publicState;
  assert.equal(afterClaimKind.rivalProgress, 5);
  assert.equal(
    afterClaimKind.river.some((card) => card.id === "ore-2-1"),
    false,
  );

  const afterSweep = resolveRivalProcedure(afterClaimKind).publicState;
  assert.equal(afterSweep.rivalProgress, 6);
  assert.equal(
    afterSweep.river.some((card) => card.id === "timber-1-1"),
    false,
  );
});

test("cooperative outcome covers win, draw, and loss", () => {
  assert.equal(
    cooperativeOutcome({ teamScore: 7, rivalProgress: 6 }).standings[0]?.result,
    "win",
  );
  assert.equal(
    cooperativeOutcome({ teamScore: 6, rivalProgress: 6 }).standings[0]?.result,
    "draw",
  );
  assert.equal(
    cooperativeOutcome({ teamScore: 5, rivalProgress: 6 }).standings[0]?.result,
    "loss",
  );
});

test("runtime reducer dispatches claim cargo through the canonical game bundle", async () => {
  const initial = await reducerBundle.initialize({
    table: createEmptyTable() as never,
    playerIds: ["player-1"],
  });
  const result = await reducerBundle.dispatch({
    state: initial,
    input: {
      kind: "interaction",
      playerId: "player-1",
      interactionId: "claimCargo",
      params: { claimId: "runtime-claim" },
    },
  });

  assert.equal(result.kind, "accept");
  if (result.kind !== "accept") return;
  assert.deepEqual(eventProcedureIds(result.events), expectedProcedures);
  const publicState = (
    result.state as unknown as { domain: { publicState: PublicState } }
  ).domain.publicState;
  assert.equal(publicState.teamScore, 2);
  assert.equal(publicState.processedClaims["runtime-claim"]?.eventCount, 4);
});
