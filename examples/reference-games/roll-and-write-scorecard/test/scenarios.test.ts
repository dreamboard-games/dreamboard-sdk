import test from "node:test";
import assert from "node:assert/strict";
import {
  assertScenario,
  exploreScenario,
  inspectScenario,
  replayScenario,
} from "@dreamboard-games/sdk/testing";
import game from "../app/game.ts";
import completeGame from "./scenarios/complete-game.scenario.ts";
import legalityProbes from "./scenarios/legality-probes.scenario.ts";
import multipleMatches from "./scenarios/multiple-matches.scenario.ts";
import noMatchFallback from "./scenarios/no-match-fallback.scenario.ts";
import oneMatch from "./scenarios/one-match.scenario.ts";
import seatOrderFour from "./scenarios/seat-order-four.scenario.ts";
import seatOrderOne from "./scenarios/seat-order-one.scenario.ts";
import seatOrderThree from "./scenarios/seat-order-three.scenario.ts";
import seatOrderTwo from "./scenarios/seat-order-two.scenario.ts";
import soloCompleteGame from "./scenarios/solo-complete-game.scenario.ts";
import tiedCompleteGame from "./scenarios/tied-complete-game.scenario.ts";

const scenarios = [
  completeGame,
  legalityProbes,
  multipleMatches,
  noMatchFallback,
  oneMatch,
  seatOrderFour,
  seatOrderOne,
  seatOrderThree,
  seatOrderTwo,
  soloCompleteGame,
  tiedCompleteGame,
] as const;

for (const scenario of scenarios) {
  test(scenario.id, async () => {
    const replay = await replayScenario({ game, scenario });
    await assertScenario({ replay, assertion: scenario.then });
  });
}

test("complete game consumes sixteen structured d6 draws deterministically", async () => {
  const [firstReplay, secondReplay, inspected] = await Promise.all([
    replayScenario({ game, scenario: completeGame }),
    replayScenario({ game, scenario: completeGame }),
    inspectScenario({
      game,
      scenario: completeGame,
      identity: {
        id: completeGame.id,
        path: "test/scenarios/complete-game.scenario.ts",
        sourceDigest: "sha256:cloudline-complete-game",
      },
      perspective: { kind: "player", seat: 0 },
      at: { segment: "when", completed: completeGame.when.length },
    }),
  ]);

  assert.deepEqual(firstReplay.state(), secondReplay.state());
  assert.deepEqual(
    firstReplay.view({ seat: 0 }),
    secondReplay.view({ seat: 0 }),
  );
  assert.deepEqual(
    firstReplay.view({ seat: 2 }),
    secondReplay.view({ seat: 2 }),
  );
  assert.deepEqual(
    firstReplay.diagnostics.events,
    secondReplay.diagnostics.events,
  );
  assert.equal(inspected.node.entropy.draws.length, 16);
  assert.equal(
    inspected.node.entropy.draws.every(
      (draw, index) =>
        draw.index === index &&
        draw.cursorBefore === index &&
        draw.cursorAfter === index + 1 &&
        draw.operation.kind === "integer" &&
        draw.operation.parameters.minInclusive === 1 &&
        draw.operation.parameters.maxInclusive === 6,
    ),
    true,
  );
});

test("every crew sees the same public survey boards at a live checkpoint", async () => {
  const inspections = await Promise.all(
    [0, 1, 2].map((seat) =>
      inspectScenario({
        game,
        scenario: completeGame,
        identity: {
          id: completeGame.id,
          path: "test/scenarios/complete-game.scenario.ts",
          sourceDigest: "sha256:cloudline-public-boards",
        },
        perspective: { kind: "player", seat },
        at: { segment: "given", completed: 3 },
      }),
    ),
  );
  const [first, ...others] = inspections;
  assert.ok(first);
  for (const inspected of others) {
    assert.deepEqual(inspected.node.publicState, first.node.publicState);
    assert.deepEqual(
      (inspected.node.view as { marksByPlayer: unknown }).marksByPlayer,
      (first.node.view as { marksByPlayer: unknown }).marksByPlayer,
    );
  }
  assert.deepEqual(
    inspections.map((inspected) => inspected.node.actions.length),
    [1, 0, 0],
  );
  assert.deepEqual(first.node.flow.pendingActors, []);
  assert.deepEqual(first.node.flow.continuationWaiters, []);
  assert.deepEqual(first.node.flow.blockedBy, []);
});

test("seed exploration distinguishes legal target branches without a roll table", async () => {
  const explored = await exploreScenario({
    game,
    scenario: multipleMatches,
    identity: {
      id: multipleMatches.id,
      path: "test/scenarios/multiple-matches.scenario.ts",
      sourceDigest: "sha256:cloudline-seed-discovery",
    },
    perspective: { kind: "player", seat: 0 },
    at: { segment: "setup", completed: 0 },
    seedRange: { start: 1, end: 2 },
  });

  assert.equal(explored.mode, "seeds");
  if (explored.mode !== "seeds") return;
  assert.deepEqual(
    explored.variants.map((variant) => ({
      seed: variant.seed,
      status: variant.status,
      total:
        variant.status === "replayed"
          ? (variant.observable?.publicState as { roll?: { total?: number } })
              .roll?.total
          : undefined,
      concreteOptionCount:
        variant.status === "replayed"
          ? variant.signature?.actions[0]?.concreteOptionCount
          : undefined,
    })),
    [
      { seed: 1, status: "replayed", total: 8, concreteOptionCount: 1 },
      { seed: 2, status: "replayed", total: 7, concreteOptionCount: 2 },
    ],
  );
});

test("fallback exploration returns every remaining cell as a canonical board command", async () => {
  const explored = await exploreScenario({
    game,
    scenario: noMatchFallback,
    identity: {
      id: noMatchFallback.id,
      path: "test/scenarios/no-match-fallback.scenario.ts",
      sourceDigest: "sha256:cloudline-fallback-exploration",
    },
    perspective: { kind: "player", seat: 0 },
    at: { segment: "given", completed: 3 },
  });

  assert.equal(explored.mode, "transitions");
  if (explored.mode !== "transitions") return;
  assert.equal(explored.candidates.length, 13);
  assert.equal(
    explored.candidates.every((candidate) => {
      const cell = candidate.command.params.cell as
        | {
            readonly boardId?: unknown;
            readonly playerId?: unknown;
            readonly spaceId?: unknown;
          }
        | undefined;
      return (
        cell?.boardId === "survey-grid" &&
        JSON.stringify(cell.playerId) === JSON.stringify({ seat: 0 }) &&
        typeof cell.spaceId === "string" &&
        candidate.after.flow.phase === "markSurvey"
      );
    }),
    true,
  );
});
