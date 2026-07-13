import assert from "node:assert/strict";
import test from "node:test";
import {
  assertScenario,
  exploreScenario,
  inspectScenario,
  probeScenarioCommand,
  replayScenario,
} from "@dreamboard-games/sdk/testing";
import game from "../app/game.ts";
import manifest from "../manifest.ts";
import { literals } from "../shared/manifest-literals.ts";
import buyingAndActionability from "./scenarios/buying-and-actionability.scenario.ts";
import completeGame from "./scenarios/complete-game.scenario.ts";
import endingMasterpiece from "./scenarios/ending-and-outcome-masterpiece.scenario.ts";
import endingThreePiles from "./scenarios/ending-and-outcome-three-piles.scenario.ts";
import setupAndVisibility from "./scenarios/setup-and-visibility.scenario.ts";
import techniqueBrainstorm from "./scenarios/technique-brainstorm.scenario.ts";
import techniqueEraser from "./scenarios/technique-eraser.scenario.ts";
import techniqueGallery from "./scenarios/technique-gallery.scenario.ts";
import techniqueStudio from "./scenarios/technique-studio.scenario.ts";
import techniqueStudioVisit from "./scenarios/technique-studio-visit.scenario.ts";
import turnOrdering from "./scenarios/turn-ordering.scenario.ts";
import zoneAndReshuffle from "./scenarios/zone-and-reshuffle.scenario.ts";
import {
  COMPLETE_GAME_COMMANDS,
  MASTERPIECE_TIE_COMMANDS,
  THREE_PILE_COMMANDS,
  command,
  type SketchbookCommand,
} from "./scenario-commands.ts";
import { defineScenario } from "./testing-types.ts";

const scenarios = [
  setupAndVisibility,
  turnOrdering,
  techniqueBrainstorm,
  techniqueStudio,
  techniqueGallery,
  techniqueEraser,
  techniqueStudioVisit,
  zoneAndReshuffle,
  buyingAndActionability,
  endingMasterpiece,
  endingThreePiles,
  completeGame,
] as const;

for (const scenario of scenarios) {
  test(scenario.id, async () => {
    const replay = await replayScenario({ game, scenario });
    await assertScenario({ replay, assertion: scenario.then });
    assert.equal(replay.complete, true);
  });
}

function identity(scenario: (typeof scenarios)[number], filename: string) {
  return {
    id: scenario.id,
    path: `test/scenarios/${filename}`,
    sourceDigest: `sha256:sketchbook-${scenario.id}`,
  } as const;
}

function availableInteractionIds(
  replay: Awaited<ReturnType<typeof replayScenario<typeof game>>>,
  seat: number,
) {
  return replay
    .interactions({ seat })
    .filter(({ availability }) => availability?.status === "available")
    .map(({ interactionId }) => interactionId);
}

function assertEveryPhysicalCardExactlyOnce(
  state: ReturnType<
    Awaited<ReturnType<typeof replayScenario<typeof game>>>["state"]
  >,
) {
  const deckCards = Object.values(
    state.table.decks,
  ).flat() as readonly string[];
  const hands = Object.values(state.table.hands) as unknown as readonly {
    readonly entries: readonly (readonly [unknown, readonly string[]])[];
  }[];
  const playerZoneCards = hands.flatMap(({ entries }) =>
    entries.flatMap((entry) => entry[1]),
  );
  const allContainerCards = [...deckCards, ...playerZoneCards];
  assert.equal(allContainerCards.length, literals.cardIds.length);
  assert.equal(new Set(allContainerCards).size, literals.cardIds.length);
  assert.deepEqual([...allContainerCards].sort(), [...literals.cardIds].sort());
  assert.deepEqual(
    Object.keys(state.table.componentLocations).sort(),
    [...literals.cardIds].sort(),
  );
}

function scoreOwnedPortfolio(
  state: ReturnType<
    Awaited<ReturnType<typeof replayScenario<typeof game>>>["state"]
  >,
) {
  const scores = { "player-1": 0, "player-2": 0 };
  for (const [cardId, playerId] of Object.entries(state.table.ownerOfCard)) {
    if (playerId !== "player-1" && playerId !== "player-2") continue;
    const properties = state.table.cards[
      cardId as keyof typeof state.table.cards
    ].properties as { readonly portfolioValue?: number };
    scores[playerId] += properties.portfolioValue ?? 0;
  }
  return scores;
}

function collectStringValues(value: unknown, values = new Set<string>()) {
  if (typeof value === "string") values.add(value);
  else if (Array.isArray(value)) {
    for (const child of value) collectStringValues(child, values);
  } else if (value && typeof value === "object") {
    for (const child of Object.values(value))
      collectStringValues(child, values);
  }
  return values;
}

test("normal setup matches the complete physical card and supply contract", async () => {
  const replay = await replayScenario({ game, scenario: setupAndVisibility });
  const state = replay.state();
  const view = replay.view({ seat: 0 });
  const expectedCards = [
    ["doodle", 44, { cost: 0, inspiration: 1 }],
    ["sketch", 20, { cost: 3, inspiration: 2 }],
    ["inkwork", 12, { cost: 6, inspiration: 3 }],
    ["idea", 14, { cost: 2, portfolioValue: 1 }],
    ["concept", 8, { cost: 5, portfolioValue: 3 }],
    ["masterpiece", 8, { cost: 8, portfolioValue: 6 }],
    ["brainstorm", 8, { cost: 4 }],
    ["studio", 8, { cost: 3 }],
    ["gallery", 8, { cost: 5 }],
    ["eraser", 8, { cost: 2 }],
    ["studio-visit", 8, { cost: 4 }],
  ] as const;
  assert.deepEqual(
    manifest.cardSets[0]?.cards.map(({ type, count, properties }) => [
      type,
      count,
      properties,
    ]),
    expectedCards,
  );
  assert.deepEqual(view.supplyCountByZoneId, {
    "supply-doodle": 30,
    "supply-sketch": 20,
    "supply-inkwork": 12,
    "supply-idea": 8,
    "supply-concept": 8,
    "supply-masterpiece": 8,
    "supply-brainstorm": 8,
    "supply-studio": 8,
    "supply-gallery": 8,
    "supply-eraser": 8,
    "supply-studio-visit": 8,
  });

  for (const playerId of ["player-1", "player-2"] as const) {
    const owned = Object.entries(state.table.ownerOfCard)
      .filter(([, owner]) => owner === playerId)
      .map(
        ([cardId]) =>
          state.table.cards[cardId as keyof typeof state.table.cards],
      );
    assert.equal(owned.length, 10);
    assert.equal(
      owned.filter(({ cardType }) => cardType === "doodle").length,
      7,
    );
    assert.equal(owned.filter(({ cardType }) => cardType === "idea").length, 3);
  }
  assertEveryPhysicalCardExactlyOnce(state);
});

test("the two opening shuffles are deterministic, independent, and projection-safe", async () => {
  const setupIdentity = identity(
    setupAndVisibility,
    "setup-and-visibility.scenario.ts",
  );
  const [first, second, playerOne, playerTwo, spectator] = await Promise.all([
    replayScenario({ game, scenario: setupAndVisibility }),
    replayScenario({ game, scenario: setupAndVisibility }),
    inspectScenario({
      game,
      scenario: setupAndVisibility,
      identity: setupIdentity,
      perspective: { kind: "player", seat: 0 },
      at: { segment: "setup", completed: 0 },
    }),
    inspectScenario({
      game,
      scenario: setupAndVisibility,
      identity: setupIdentity,
      perspective: { kind: "player", seat: 1 },
      at: { segment: "setup", completed: 0 },
    }),
    inspectScenario({
      game,
      scenario: setupAndVisibility,
      identity: setupIdentity,
      perspective: { kind: "spectator" },
      at: { segment: "setup", completed: 0 },
    }),
  ]);
  assert.equal(first.checkpointDigest, second.checkpointDigest);
  assert.notDeepEqual(
    first.view({ seat: 0 }).myHand,
    first.view({ seat: 1 }).myHand,
  );
  assert.equal(playerOne.node.entropy.draws.length, 18);
  assert.deepEqual(
    playerOne.node.entropy.draws.map(({ operation }) => operation.parameters),
    [
      ...Array.from({ length: 9 }, (_, index) => ({
        minInclusive: 0,
        maxInclusive: 9 - index,
      })),
      ...Array.from({ length: 9 }, (_, index) => ({
        minInclusive: 0,
        maxInclusive: 9 - index,
      })),
    ],
  );

  const firstState = first.state();
  const privateByOwner = {
    "player-1": Object.entries(firstState.table.ownerOfCard)
      .filter(([, owner]) => owner === "player-1")
      .map(([cardId]) => cardId),
    "player-2": Object.entries(firstState.table.ownerOfCard)
      .filter(([, owner]) => owner === "player-2")
      .map(([cardId]) => cardId),
  };
  const playerOneValues = collectStringValues(playerOne.node.view);
  const playerTwoValues = collectStringValues(playerTwo.node.view);
  const spectatorValues = collectStringValues(spectator.node.view);
  const playerOneHand = new Set(first.view({ seat: 0 }).myHand);
  const playerTwoHand = new Set(first.view({ seat: 1 }).myHand);
  for (const cardId of privateByOwner["player-2"]) {
    assert.equal(playerOneValues.has(cardId), false);
    assert.equal(spectatorValues.has(cardId), false);
  }
  for (const cardId of privateByOwner["player-1"]) {
    if (!playerOneHand.has(cardId as never)) {
      assert.equal(playerOneValues.has(cardId), false);
    }
    assert.equal(spectatorValues.has(cardId), false);
  }
  for (const cardId of privateByOwner["player-1"]) {
    assert.equal(playerTwoValues.has(cardId), false);
  }
  assert.equal(playerOneHand.size, 5);
  assert.equal(playerTwoHand.size, 5);
  assert.equal("myHand" in (spectator.node.view as object), false);
});

test("turn sequencing is action, buy, cleanup, end check, then rotation", async () => {
  const setup = await replayScenario({
    game,
    scenario: turnOrdering,
    at: { segment: "setup", completed: 0 },
  });
  assert.deepEqual(availableInteractionIds(setup, 0), ["endActionStep"]);
  assert.deepEqual(availableInteractionIds(setup, 1), []);

  const buy = await replayScenario({
    game,
    scenario: turnOrdering,
    at: { segment: "given", completed: 1 },
  });
  assert.equal(buy.state().phase.step, "buy");
  const noReturnDigest = buy.checkpointDigest;
  assert.equal(
    (
      await probeScenarioCommand({
        replay: buy,
        command: command(0, "endActionStep"),
      })
    ).kind,
    "rejected",
  );
  assert.equal(buy.checkpointDigest, noReturnDigest);

  const afterBuy = await replayScenario({
    game,
    scenario: turnOrdering,
    at: { segment: "given", completed: 5 },
  });
  assert.equal(afterBuy.state().phase.step, "buy");
  assert.deepEqual(afterBuy.state().flow.activePlayers, ["player-1"]);
  assert.deepEqual(
    afterBuy.view({ seat: 0 }).discardCardsByPlayerId["player-1"],
    ["studio-1"],
  );

  const afterCleanup = await replayScenario({ game, scenario: turnOrdering });
  assert.equal(afterCleanup.state().phase.step, "action");
  assert.deepEqual(afterCleanup.state().flow.activePlayers, ["player-2"]);
  assert.equal(
    afterCleanup.view({ seat: 0 }).handCountByPlayerId["player-1"],
    5,
  );
  assert.deepEqual(
    afterCleanup
      .state()
      .publicState.history.slice(-2)
      .map(({ kind }) => kind),
    ["cleanup", "endCheck"],
  );

  const earlyEnd = defineScenario({
    id: "sketchbook.turn-ordering.legal-early-end",
    description: "The active artist can end both action and buy steps early.",
    setup: { players: 2, seed: 1 },
    given: [command(0, "endActionStep")],
    when: [command(0, "endTurn")],
    then: () => {},
  });
  const earlyEndReplay = await replayScenario({ game, scenario: earlyEnd });
  assert.deepEqual(earlyEndReplay.state().flow.activePlayers, ["player-2"]);
});

test("Technique effects spend and grant the exact resources needed for chains", async () => {
  const beforeBrainstorm = await replayScenario({
    game,
    scenario: techniqueBrainstorm,
    at: { segment: "given", completed: 26 },
  });
  assert.equal(
    beforeBrainstorm.view({ seat: 0 }).myHand.includes("brainstorm-1"),
    true,
  );
  assert.equal(beforeBrainstorm.view({ seat: 0 }).myHand.length, 5);
  const afterBrainstorm = await replayScenario({
    game,
    scenario: techniqueBrainstorm,
  });
  assert.equal(afterBrainstorm.view({ seat: 0 }).myHand.length, 7);
  assert.equal(afterBrainstorm.state().phase.actionsLeft, 0);

  const afterStudio = await replayScenario({ game, scenario: techniqueStudio });
  assert.equal(afterStudio.state().phase.actionsLeft, 2);
  const afterStudioBrainstorm = await replayScenario({
    game,
    scenario: completeGame,
    at: { segment: "given", completed: 62 },
  });
  assert.equal(afterStudioBrainstorm.state().phase.actionsLeft, 1);
  assert.deepEqual(
    afterStudioBrainstorm.view({ seat: 1 }).inPlayCardsByPlayerId["player-2"],
    ["studio-2", "brainstorm-2"],
  );

  const beforeGallery = await replayScenario({
    game,
    scenario: techniqueGallery,
    at: { segment: "given", completed: 124 },
  });
  const afterGallery = await replayScenario({
    game,
    scenario: techniqueGallery,
  });
  assert.equal(
    afterGallery.view({ seat: 1 }).myHand.length,
    beforeGallery.view({ seat: 1 }).myHand.length,
  );
  assert.equal(afterGallery.state().phase.actionsLeft, 1);
  assert.equal(afterGallery.state().phase.buysLeft, 2);
  assert.equal(afterGallery.state().phase.inspiration, 1);
});

test("Eraser discovery is exclusive and enumerates every zero-to-four subset", async () => {
  const pending = await replayScenario({
    game,
    scenario: techniqueEraser,
    at: { segment: "given", completed: 85 },
  });
  assert.deepEqual(availableInteractionIds(pending, 0), ["resolveEraser"]);
  assert.deepEqual(availableInteractionIds(pending, 1), []);
  const eraserIdentity = identity(
    techniqueEraser,
    "technique-eraser.scenario.ts",
  );
  const inspected = await inspectScenario({
    game,
    scenario: techniqueEraser,
    identity: eraserIdentity,
    perspective: { kind: "player", seat: 0 },
    at: { segment: "given", completed: 85 },
  });
  assert.deepEqual(inspected.node.flow.blockedBy, []);
  assert.deepEqual(
    inspected.node.actions.map(({ interactionId }) => interactionId),
    ["resolveEraser"],
  );
  const explored = await exploreScenario({
    game,
    scenario: techniqueEraser,
    identity: eraserIdentity,
    perspective: { kind: "player", seat: 0 },
    at: { segment: "given", completed: 85 },
    limit: 100,
  });
  assert.equal(explored.mode, "transitions");
  if (explored.mode !== "transitions") return;
  assert.equal(explored.candidates.length, 65);
  const hand = new Set(pending.view({ seat: 0 }).myHand);
  const lengths = new Set<number>();
  for (const candidate of explored.candidates) {
    const candidateCommand = candidate.command as SketchbookCommand;
    assert.equal(candidateCommand.interactionId, "resolveEraser");
    if (candidateCommand.interactionId !== "resolveEraser") continue;
    const cardIds = candidateCommand.params.cardIds ?? [];
    lengths.add(cardIds.length);
    assert.equal(new Set(cardIds).size, cardIds.length);
    assert.equal(
      cardIds.every((cardId) => hand.has(cardId)),
      true,
    );
    assert.equal(
      (
        await probeScenarioCommand({
          replay: pending,
          command: candidateCommand,
        })
      ).kind,
      "accepted",
    );
  }
  assert.deepEqual([...lengths].sort(), [0, 1, 2, 3, 4]);

  const fourCardBranch = defineScenario({
    id: "sketchbook.technique-eraser-four",
    description: "Eraser trashes all four legal remaining cards.",
    setup: { players: 2, seed: 1 },
    given: COMPLETE_GAME_COMMANDS.slice(0, 85),
    when: [
      command(0, "resolveEraser", [
        "doodle-1",
        "doodle-3",
        "idea-1",
        "doodle-6",
      ]),
    ],
    then: () => {},
  });
  const four = await replayScenario({ game, scenario: fourCardBranch });
  assert.deepEqual(four.view({ seat: 0 }).trashCards, [
    "doodle-1",
    "doodle-3",
    "idea-1",
    "doodle-6",
  ]);
  const sourceDigest = pending.checkpointDigest;
  for (const [probe, errorCode] of [
    [command(0, "resolveEraser", ["doodle-1", "doodle-1"]), "DUPLICATE_CARD"],
    [
      command(0, "resolveEraser", [
        "doodle-1",
        "doodle-3",
        "idea-1",
        "doodle-6",
        "doodle-2",
      ]),
      "INVALID_INPUT_COUNT",
    ],
  ] as const) {
    const result = await probeScenarioCommand({
      replay: pending,
      command: probe,
    });
    assert.equal(result.kind, "rejected");
    if (result.kind === "rejected") assert.equal(result.errorCode, errorCode);
    assert.equal(pending.checkpointDigest, sourceDigest);
  }
});

test("Studio Visit discovery exposes only current nonempty top cards costing at most four", async () => {
  const pending = await replayScenario({
    game,
    scenario: techniqueStudioVisit,
    at: { segment: "given", completed: 72 },
  });
  assert.deepEqual(availableInteractionIds(pending, 0), ["resolveStudioVisit"]);
  const studioVisitIdentity = identity(
    techniqueStudioVisit,
    "technique-studio-visit.scenario.ts",
  );
  const explored = await exploreScenario({
    game,
    scenario: techniqueStudioVisit,
    identity: studioVisitIdentity,
    perspective: { kind: "player", seat: 0 },
    at: { segment: "given", completed: 72 },
    limit: 20,
  });
  assert.equal(explored.mode, "transitions");
  if (explored.mode !== "transitions") return;
  const cardIds = explored.candidates.flatMap(({ command: candidate }) =>
    candidate.interactionId === "resolveStudioVisit"
      ? [candidate.params.cardId]
      : [],
  );
  assert.deepEqual(cardIds, [
    "brainstorm-3",
    "doodle-15",
    "eraser-2",
    "idea-8",
    "sketch-3",
    "studio-3",
    "studio-visit-3",
  ]);
  for (const candidate of explored.candidates) {
    assert.equal(
      (
        await probeScenarioCommand({
          replay: pending,
          command: candidate.command as SketchbookCommand,
        })
      ).kind,
      "accepted",
    );
  }
  for (const [probe, errorCode] of [
    [command(0, "resolveStudioVisit", "masterpiece-1"), "OVER_COST_LIMIT"],
    [command(0, "resolveStudioVisit", "sketch-4"), "NOT_TOP_CARD"],
  ] as const) {
    const result = await probeScenarioCommand({
      replay: pending,
      command: probe,
    });
    assert.equal(result.kind, "rejected");
    if (result.kind === "rejected") assert.equal(result.errorCode, errorCode);
  }
});

test("buy discovery is affordable, repeatable, top-card-only, and has no bulk action", async () => {
  const ready = await replayScenario({
    game,
    scenario: buyingAndActionability,
    at: { segment: "given", completed: 4 },
  });
  const buyIdentity = identity(
    buyingAndActionability,
    "buying-and-actionability.scenario.ts",
  );
  const explored = await exploreScenario({
    game,
    scenario: buyingAndActionability,
    identity: buyIdentity,
    perspective: { kind: "player", seat: 0 },
    at: { segment: "given", completed: 4 },
    limit: 20,
  });
  assert.equal(explored.mode, "transitions");
  if (explored.mode !== "transitions") return;
  assert.deepEqual(
    explored.candidates.map(({ command: candidate }) => [
      candidate.interactionId,
      "cardId" in candidate.params ? candidate.params.cardId : null,
    ]),
    [
      ["buyCard", "doodle-15"],
      ["buyCard", "eraser-1"],
      ["buyCard", "idea-7"],
      ["buyCard", "sketch-1"],
      ["buyCard", "studio-1"],
      ["endTurn", null],
    ],
  );
  for (const candidate of explored.candidates) {
    assert.equal(
      (
        await probeScenarioCommand({
          replay: ready,
          command: candidate.command as SketchbookCommand,
        })
      ).kind,
      "accepted",
    );
  }
  assert.equal(
    ready
      .interactions({ seat: 0 })
      .some(({ interactionId }) =>
        ["playAll", "playAllInspiration", "playTreasures"].includes(
          String(interactionId),
        ),
      ),
    false,
  );

  const afterFirstOfTwoBuys = await replayScenario({
    game,
    scenario: completeGame,
    at: { segment: "given", completed: 130 },
  });
  assert.equal(afterFirstOfTwoBuys.state().phase.buysLeft, 1);
  const stale = await probeScenarioCommand({
    replay: afterFirstOfTwoBuys,
    command: command(1, "buyCard", "eraser-2"),
  });
  assert.equal(stale.kind, "rejected");
  if (stale.kind === "rejected") {
    assert.equal(stale.errorCode, "CARD_TARGET_NOT_ELIGIBLE");
  }
});

test("acquisitions, cleanup, and mid-turn reshuffles preserve every card exactly once", async () => {
  const beforePurchase = await replayScenario({
    game,
    scenario: completeGame,
    at: { segment: "given", completed: 4 },
  });
  const afterPurchase = await replayScenario({
    game,
    scenario: completeGame,
    at: { segment: "given", completed: 5 },
  });
  const afterCleanup = await replayScenario({
    game,
    scenario: completeGame,
    at: { segment: "given", completed: 6 },
  });
  assert.equal(
    beforePurchase.view({ seat: 0 }).supplyTopCardByZoneId["supply-studio"],
    "studio-1",
  );
  assert.deepEqual(
    afterPurchase.view({ seat: 0 }).discardCardsByPlayerId["player-1"],
    ["studio-1"],
  );
  assert.equal(
    afterCleanup
      .view({ seat: 0 })
      .discardCardsByPlayerId["player-1"].includes("studio-1"),
    true,
  );

  const beforeRecycle = await replayScenario({
    game,
    scenario: completeGame,
    at: { segment: "given", completed: 26 },
  });
  const afterRecycle = await replayScenario({
    game,
    scenario: completeGame,
    at: { segment: "given", completed: 27 },
  });
  assert.equal(
    beforeRecycle.view({ seat: 0 }).myHand.includes("brainstorm-1"),
    true,
  );
  assert.equal(
    afterRecycle
      .view({ seat: 0 })
      .inPlayCardsByPlayerId["player-1"].includes("brainstorm-1"),
    true,
  );

  const beforeMidTurnShuffle = await replayScenario({
    game,
    scenario: completeGame,
    at: { segment: "given", completed: 100 },
  });
  const afterMidTurnShuffle = await replayScenario({
    game,
    scenario: completeGame,
    at: { segment: "given", completed: 101 },
  });
  const retainedHand = beforeMidTurnShuffle
    .view({ seat: 0 })
    .myHand.filter((cardId) => cardId !== "studio-1");
  assert.equal(
    retainedHand.every((cardId) =>
      afterMidTurnShuffle.view({ seat: 0 }).myHand.includes(cardId),
    ),
    true,
  );
  assert.equal(
    afterMidTurnShuffle
      .view({ seat: 0 })
      .inPlayCardsByPlayerId["player-1"].includes("studio-1"),
    true,
  );
  assert.equal(
    afterMidTurnShuffle.trace
      .at(-1)
      ?.trace.some(({ kind }) => kind === "rngConsumption"),
    true,
  );

  const terminal = await replayScenario({ game, scenario: completeGame });
  for (const replay of [beforePurchase, afterMidTurnShuffle, terminal]) {
    assertEveryPhysicalCardExactlyOnce(replay.state());
  }
});

test("all supply endings wait for cleanup and score every owned zone", async () => {
  const branches = [
    [completeGame, COMPLETE_GAME_COMMANDS, "SIMULTANEOUS_SUPPLY_END"],
    [endingMasterpiece, MASTERPIECE_TIE_COMMANDS, "MASTERPIECE_SUPPLY_EMPTY"],
    [endingThreePiles, THREE_PILE_COMMANDS, "THREE_SUPPLY_PILES_EMPTY"],
  ] as const;
  for (const [scenario, commands, reasonCode] of branches) {
    const beforeEndTurn = await replayScenario({
      game,
      scenario,
      at: { segment: "given", completed: commands.length - 1 },
    });
    assert.equal(beforeEndTurn.state().flow.currentPhase, "playerTurn");
    assert.equal(beforeEndTurn.state().publicState.outcome, null);
    const terminal = await replayScenario({ game, scenario });
    assert.equal(terminal.state().flow.currentPhase, "gameOver");
    assert.equal(terminal.state().publicState.outcome?.reason.code, reasonCode);
    assert.deepEqual(
      terminal
        .state()
        .publicState.history.slice(-2)
        .map(({ kind }) => kind),
      ["cleanup", "endCheck"],
    );
    assert.deepEqual(
      terminal.view({ seat: 0 }).portfolioScores,
      scoreOwnedPortfolio(terminal.state()),
    );
    assert.equal(
      terminal.view({ seat: 0 }).handCountByPlayerId[
        terminal.state().publicState.history.at(-2)?.actorPlayerId ?? "player-1"
      ],
      5,
    );
    assert.deepEqual(terminal.interactions({ seat: 0 }), []);
    assert.deepEqual(terminal.interactions({ seat: 1 }), []);
  }
});

test("the canonical growing-deck game is deterministic and exercises every Technique", async () => {
  const [first, second] = await Promise.all([
    replayScenario({ game, scenario: completeGame }),
    replayScenario({ game, scenario: completeGame }),
  ]);
  assert.equal(first.checkpointDigest, second.checkpointDigest);
  const techniqueIds = new Set(
    first
      .state()
      .publicState.history.flatMap(({ kind, cardId }) =>
        kind === "technique" && cardId
          ? [cardId.split("-").slice(0, -1).join("-")]
          : [],
      ),
  );
  assert.deepEqual([...techniqueIds].sort(), [
    "brainstorm",
    "eraser",
    "gallery",
    "studio",
    "studio-visit",
  ]);
  const acquisition = first
    .state()
    .publicState.history.findIndex(
      ({ kind, cardId }) => kind === "cardGained" && cardId === "brainstorm-1",
    );
  const laterPlay = first
    .state()
    .publicState.history.findIndex(
      ({ kind, cardId }) => kind === "technique" && cardId === "brainstorm-1",
    );
  assert.equal(acquisition >= 0, true);
  assert.equal(laterPlay > acquisition, true);
  assert.equal(first.state().publicState.turnNumber > 2, true);
});
