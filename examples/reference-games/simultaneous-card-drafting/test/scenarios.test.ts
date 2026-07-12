import test from "node:test";
import assert from "node:assert/strict";
import {
  assertScenario,
  exploreScenario,
  inspectScenario,
  probeScenarioCommand,
  replayScenario,
  type ScenarioCommandOf,
} from "@dreamboard-games/sdk/testing";
import game from "../app/game.ts";
import barrierActionability from "./scenarios/barrier-actionability.scenario.ts";
import completeGame from "./scenarios/complete-game.scenario.ts";
import outcomeLowerPlaceTie from "./scenarios/outcome-lower-place-tie.scenario.ts";
import outcomeSoleWinner from "./scenarios/outcome-sole-winner.scenario.ts";
import outcomeTiedWinner from "./scenarios/outcome-tied-winner.scenario.ts";
import projectionPrivacy from "./scenarios/projection-privacy.scenario.ts";
import roundScoring from "./scenarios/round-scoring.scenario.ts";
import supportedPlayerCount2 from "./scenarios/supported-player-count-2.scenario.ts";
import supportedPlayerCount3 from "./scenarios/supported-player-count-3.scenario.ts";
import supportedPlayerCount4 from "./scenarios/supported-player-count-4.scenario.ts";
import supportedPlayerCount5 from "./scenarios/supported-player-count-5.scenario.ts";
import { submit } from "./scenarios/commands.ts";

const scenarios = [
  barrierActionability,
  completeGame,
  outcomeLowerPlaceTie,
  outcomeSoleWinner,
  outcomeTiedWinner,
  projectionPrivacy,
  roundScoring,
  supportedPlayerCount2,
  supportedPlayerCount3,
  supportedPlayerCount4,
  supportedPlayerCount5,
] as const;

for (const scenario of scenarios) {
  test(scenario.id, async () => {
    const replay = await replayScenario({ game, scenario });
    await assertScenario({ replay, assertion: scenario.then });
  });
}

const barrierIdentity = {
  id: barrierActionability.id,
  path: "test/scenarios/barrier-actionability.scenario.ts",
  sourceDigest: "sha256:lantern-market-barrier",
} as const;

test("the sealed barrier derives actors, waiters, blockers, and perspective actions", async () => {
  const checkpoints = await Promise.all(
    [0, 1, 2, 3].map(async (completed) => {
      const perspectives = await Promise.all(
        [0, 1, 2].map((seat) =>
          inspectScenario({
            game,
            scenario: barrierActionability,
            identity: barrierIdentity,
            perspective: { kind: "player", seat },
            at: { segment: "given", completed },
          }),
        ),
      );
      return perspectives.map(({ node }) => node);
    }),
  );

  assert.deepEqual(
    checkpoints[0]?.[0]?.flow.activeActors.map(({ seat }) => seat),
    [0, 1, 2],
  );
  assert.deepEqual(
    checkpoints[0]?.[0]?.flow.pendingActors.map(({ seat }) => seat),
    [0, 1, 2],
  );
  assert.deepEqual(
    checkpoints[0]?.map((node) => node.actions.map(({ actor }) => actor.seat)),
    [[0], [1], [2]],
  );
  assert.deepEqual(checkpoints[0]?.[0]?.flow.continuationWaiters, []);
  assert.deepEqual(checkpoints[0]?.[0]?.flow.blockedBy, []);

  assert.deepEqual(
    checkpoints[1]?.[0]?.flow.activeActors.map(({ seat }) => seat),
    [0, 1],
  );
  assert.deepEqual(
    checkpoints[1]?.[0]?.flow.pendingActors.map(({ seat }) => seat),
    [0, 1],
  );
  assert.deepEqual(
    checkpoints[1]?.[0]?.flow.continuationWaiters.map(({ seat }) => seat),
    [2],
  );
  assert.deepEqual(
    checkpoints[1]?.[0]?.flow.blockedBy.map(({ actor, blockers }) => ({
      waiter: actor.seat,
      blockers: blockers.map(({ seat }) => seat),
    })),
    [{ waiter: 2, blockers: [0, 1] }],
  );
  assert.deepEqual(
    checkpoints[1]?.map((node) => node.actions.map(({ actor }) => actor.seat)),
    [[0], [1], []],
  );

  assert.deepEqual(
    checkpoints[2]?.[0]?.flow.activeActors.map(({ seat }) => seat),
    [1],
  );
  assert.deepEqual(
    checkpoints[2]?.[0]?.flow.continuationWaiters.map(({ seat }) => seat),
    [0, 2],
  );
  assert.deepEqual(
    checkpoints[2]?.[0]?.flow.blockedBy.map(({ actor, blockers }) => ({
      waiter: actor.seat,
      blockers: blockers.map(({ seat }) => seat),
    })),
    [
      { waiter: 0, blockers: [1] },
      { waiter: 2, blockers: [1] },
    ],
  );
  assert.deepEqual(
    checkpoints[2]?.map((node) => node.actions.map(({ actor }) => actor.seat)),
    [[], [1], []],
  );
  const handIds = (node: (typeof checkpoints)[number][number]) =>
    (node.view as { hand: readonly { id: string }[] }).hand.map(({ id }) => id);
  for (const seat of [0, 1, 2]) {
    assert.deepEqual(
      handIds(checkpoints[1]![seat]!),
      handIds(checkpoints[0]![seat]!),
    );
    assert.deepEqual(
      handIds(checkpoints[2]![seat]!),
      handIds(checkpoints[0]![seat]!),
    );
  }
  assert.deepEqual(
    checkpoints[2]?.map(
      (node) =>
        Object.values(
          (
            node.view as {
              stallByPlayer: Record<string, readonly unknown[]>;
            }
          ).stallByPlayer,
        ).flat().length,
    ),
    [0, 0, 0],
  );

  assert.equal(
    (checkpoints[2]?.[0]?.view as { pick?: number } | undefined)?.pick,
    1,
  );
  assert.equal(
    (checkpoints[3]?.[0]?.view as { pick?: number } | undefined)?.pick,
    2,
  );
  assert.deepEqual(
    checkpoints[3]?.[0]?.flow.activeActors.map(({ seat }) => seat),
    [0, 1, 2],
  );
  assert.deepEqual(checkpoints[3]?.[0]?.flow.continuationWaiters, []);
  assert.deepEqual(checkpoints[3]?.[0]?.flow.blockedBy, []);
  assert.deepEqual(handIds(checkpoints[3]![0]!), [
    "tea-cup-15",
    "lantern-1",
    "tea-cup-2",
    "lantern-6",
    "tea-cup-20",
  ]);
  assert.deepEqual(handIds(checkpoints[3]![1]!), [
    "festival-banner-12",
    "festival-banner-14",
    "festival-banner-20",
    "lantern-18",
    "lantern-12",
  ]);
  assert.deepEqual(handIds(checkpoints[3]![2]!), [
    "lantern-19",
    "lantern-5",
    "tea-cup-14",
    "lantern-15",
    "festival-banner-17",
  ]);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(
        (
          checkpoints[3]![0]!.view as {
            stallByPlayer: Record<string, readonly { id: string }[]>;
          }
        ).stallByPlayer,
      ).map(([playerId, cards]) => [playerId, cards.map(({ id }) => id)]),
    ),
    {
      "player-1": ["festival-banner-18"],
      "player-2": ["tea-cup-7"],
      "player-3": ["lantern-13"],
    },
  );
});

test("duplicate and stale barrier commands reject without mutating the source replay", async () => {
  const afterFirstCommit = await replayScenario({
    game,
    scenario: barrierActionability,
    at: { segment: "given", completed: 1 },
  });
  const sourceDigest = afterFirstCommit.checkpointDigest;
  const duplicate = await probeScenarioCommand({
    replay: afterFirstCommit,
    command: submit(2, "lantern-13"),
  });
  assert.equal(duplicate.kind, "rejected");
  if (duplicate.kind === "rejected") {
    assert.equal(duplicate.errorCode, "ALREADY_SUBMITTED");
  }
  assert.equal(afterFirstCommit.checkpointDigest, sourceDigest);

  const afterReveal = await replayScenario({
    game,
    scenario: barrierActionability,
  });
  const stale = await probeScenarioCommand({
    replay: afterReveal,
    command: submit(2, "lantern-13"),
  });
  assert.equal(stale.kind, "rejected");
  if (stale.kind === "rejected") {
    assert.equal(stale.errorCode, "CARD_TARGET_NOT_ELIGIBLE");
  }
});

test("explore emits only accepted concrete cards from each pending owner's hand", async () => {
  const replay = await replayScenario({
    game,
    scenario: barrierActionability,
    at: { segment: "given", completed: 1 },
  });
  for (const seat of [0, 1]) {
    const explored = await exploreScenario({
      game,
      scenario: barrierActionability,
      identity: barrierIdentity,
      perspective: { kind: "player", seat },
      at: { segment: "given", completed: 1 },
      limit: 20,
    });
    assert.equal(explored.mode, "transitions");
    if (explored.mode !== "transitions") continue;
    assert.equal(explored.candidates.length, 6);
    const ownHand = new Set(
      (replay.view({ seat }) as { hand: readonly { id: string }[] }).hand.map(
        ({ id }) => id,
      ),
    );
    for (const candidate of explored.candidates) {
      assert.equal(candidate.command.actor.seat, seat);
      assert.equal(candidate.command.interactionId, "submit");
      assert.equal(ownHand.has(String(candidate.command.params.cardId)), true);
      const result = await probeScenarioCommand({
        replay,
        command: candidate.command as ScenarioCommandOf<typeof game>,
      });
      assert.equal(result.kind, "accepted");
    }
  }

  const committed = await exploreScenario({
    game,
    scenario: barrierActionability,
    identity: barrierIdentity,
    perspective: { kind: "player", seat: 2 },
    at: { segment: "given", completed: 1 },
    limit: 20,
  });
  assert.equal(committed.mode, "transitions");
  if (committed.mode === "transitions") {
    assert.deepEqual(committed.candidates, []);
  }
});

test("private hands, sealed choices, and the undealt deck stay perspective-safe", async () => {
  const before = await Promise.all(
    [0, 1, 2].map((seat) =>
      inspectScenario({
        game,
        scenario: barrierActionability,
        identity: barrierIdentity,
        perspective: { kind: "player", seat },
        at: { segment: "given", completed: 0 },
      }),
    ),
  );
  assert.equal(JSON.stringify(before[0]?.node).includes("tea-cup-7"), false);
  assert.equal(JSON.stringify(before[0]?.node).includes("lantern-13"), false);
  assert.equal(
    JSON.stringify(before[1]?.node).includes("festival-banner-18"),
    false,
  );

  const [waitingPlayer, spectator] = await Promise.all([
    inspectScenario({
      game,
      scenario: barrierActionability,
      identity: barrierIdentity,
      perspective: { kind: "player", seat: 0 },
      at: { segment: "given", completed: 1 },
    }),
    inspectScenario({
      game,
      scenario: barrierActionability,
      identity: barrierIdentity,
      perspective: { kind: "spectator" },
      at: { segment: "given", completed: 1 },
    }),
  ]);
  assert.equal(
    JSON.stringify(waitingPlayer.node).includes("lantern-13"),
    false,
  );
  assert.equal(JSON.stringify(spectator.node).includes("lantern-13"), false);
  assert.equal(
    JSON.stringify(waitingPlayer.node).includes("festival-banner-9"),
    false,
  );
  assert.equal(
    JSON.stringify(spectator.node).includes("festival-banner-9"),
    false,
  );

  const revealed = await inspectScenario({
    game,
    scenario: barrierActionability,
    identity: barrierIdentity,
    perspective: { kind: "player", seat: 0 },
    at: { segment: "given", completed: 3 },
  });
  assert.equal(JSON.stringify(revealed.node.view).includes("lantern-13"), true);
  assert.equal(
    JSON.stringify(revealed.node.view).includes("festival-banner-18"),
    true,
  );
});

test("supported player counts deal deterministically from one shuffle", async () => {
  const reconstructedDecks: string[][] = [];
  for (const scenario of [
    supportedPlayerCount2,
    supportedPlayerCount3,
    supportedPlayerCount4,
    supportedPlayerCount5,
  ]) {
    const [first, second, opening] = await Promise.all([
      replayScenario({ game, scenario }),
      replayScenario({ game, scenario }),
      replayScenario({
        game,
        scenario,
        at: { segment: "setup", completed: 0 },
      }),
    ]);
    assert.deepEqual(first.state(), second.state());
    for (let seat = 0; seat < scenario.setup.players; seat += 1) {
      assert.deepEqual(first.view({ seat }), second.view({ seat }));
      assert.equal(opening.view({ seat }).hand.length, 6);
    }
    for (let viewer = 0; viewer < scenario.setup.players; viewer += 1) {
      const visibleCardIds = new Set<string>(
        opening.view({ seat: viewer }).hand.map(({ id }) => id),
      );
      for (let owner = 0; owner < scenario.setup.players; owner += 1) {
        if (viewer === owner) continue;
        for (const card of opening.view({ seat: owner }).hand) {
          assert.equal(visibleCardIds.has(card.id), false);
        }
      }
    }
    const dealtInSeatOrder = Array.from({ length: 6 }, (_, pick) =>
      Array.from(
        { length: scenario.setup.players },
        (_, seat) => opening.view({ seat }).hand[pick]?.id,
      ),
    ).flat();
    assert.equal(dealtInSeatOrder.every(Boolean), true);
    const undealt = opening.state().table.zones.shared["market-deck"];
    assert.equal(undealt.length, 60 - scenario.setup.players * 6);
    for (let viewer = 0; viewer < scenario.setup.players; viewer += 1) {
      const visibleCardIds = new Set<string>(
        opening.view({ seat: viewer }).hand.map(({ id }) => id),
      );
      for (const cardId of undealt) {
        assert.equal(visibleCardIds.has(cardId), false);
      }
    }
    reconstructedDecks.push([...dealtInSeatOrder.map(String), ...undealt]);
  }
  for (const reconstructed of reconstructedDecks.slice(1)) {
    assert.deepEqual(reconstructed, reconstructedDecks[0]);
  }

  const [roundOneOpening, roundTwoOpening] = await Promise.all([
    replayScenario({
      game,
      scenario: completeGame,
      at: { segment: "setup", completed: 0 },
    }),
    replayScenario({
      game,
      scenario: completeGame,
      at: { segment: "given", completed: 12 },
    }),
  ]);
  const nextCardsInOriginalDeck = roundOneOpening
    .state()
    .table.zones.shared["market-deck"].slice(0, 12);
  const roundTwoDeal = Array.from({ length: 6 }, (_, pick) =>
    [0, 1].map((seat) => roundTwoOpening.view({ seat }).hand[pick]?.id),
  )
    .flat()
    .map(String);
  assert.deepEqual(roundTwoDeal, nextCardsInOriginalDeck);

  const inspected = await inspectScenario({
    game,
    scenario: completeGame,
    identity: {
      id: completeGame.id,
      path: "test/scenarios/complete-game.scenario.ts",
      sourceDigest: "sha256:lantern-market-complete",
    },
    perspective: { kind: "player", seat: 0 },
    at: { segment: "when", completed: completeGame.when.length },
  });
  assert.equal(inspected.node.entropy.draws.length, 59);
  assert.equal(
    inspected.node.entropy.draws.every(
      (draw, index) =>
        draw.index === index &&
        draw.cursorBefore === index &&
        draw.cursorAfter === index + 1 &&
        draw.operation.kind === "integer",
    ),
    true,
  );
});
