import { describe, expect, test } from "bun:test";
import game from "../app/game";
import { createReducerBundle } from "@dreamboard-games/sdk/reducer";
import type { JsonValue } from "@dreamboard-games/sdk/types";
import { createInitialTable } from "../shared/manifest-contract";
import { z } from "zod";
import { publicStateSchema } from "../app/game-contract";

const PLAYERS = ["player-1", "player-2", "player-3", "player-4"] as const;
type Player = (typeof PLAYERS)[number];

const RANK_ORDER: Record<string, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

async function bootstrap() {
  const bundle = createReducerBundle(game);
  const table = createInitialTable({ playerIds: [...PLAYERS] });
  const initial = await bundle.initialize({
    table: table as unknown as JsonValue,
    playerIds: [...PLAYERS],
    rngSeed: 42,
    setup: { profileId: "default", optionValues: {} },
  });
  return { bundle, state: initial };
}

type BootstrapResult = Awaited<ReturnType<typeof bootstrap>>;
type HeartsBundle = BootstrapResult["bundle"];
type HeartsState = BootstrapResult["state"];
type HeartsInput = Parameters<HeartsBundle["dispatch"]>[0]["input"];
type HeartsDispatchResult = Awaited<ReturnType<HeartsBundle["dispatch"]>>;
type HeartsRejectResult = Extract<HeartsDispatchResult, { kind: "reject" }>;

const handEntriesSchema = z.object({
  zones: z.object({
    perPlayer: z.object({
      hand: z.object({
        entries: z.array(z.tuple([z.string(), z.array(z.string())])),
      }),
    }),
  }),
});

const seatProjectionSchema = z.object({
  seats: z.record(
    z.string(),
    z.object({
      availableInteractions: z.array(
        z
          .object({
            interactionKey: z.string(),
            inputs: z.array(
              z
                .object({
                  key: z.string(),
                  domain: z
                    .object({
                      eligibleTargets: z.array(z.string()).optional(),
                    })
                    .passthrough()
                    .optional(),
                })
                .passthrough(),
            ),
          })
          .passthrough(),
      ),
    }),
  ),
});

function handOf(state: HeartsState, playerId: string): string[] {
  const table = handEntriesSchema.parse(state.domain.table);
  const entries = table.zones.perPlayer.hand.entries;
  for (const [pid, cards] of entries) {
    if (pid === playerId) return cards;
  }
  return [];
}

function currentPhase(state: HeartsState): string {
  return state.domain.flow.currentPhase;
}

function passInput(playerId: Player, cardIds: readonly string[]) {
  return {
    kind: "interaction" as const,
    interactionId: "submit",
    playerId,
    params: { cardIds: [...cardIds] },
  };
}

function playInput(playerId: Player, cardId: string) {
  return {
    kind: "interaction" as const,
    interactionId: "playCard",
    playerId,
    params: { cardId },
  };
}

async function dispatchOrThrow(
  bundle: HeartsBundle,
  state: HeartsState,
  input: HeartsInput,
): Promise<HeartsState> {
  const result = await bundle.dispatch({ state, input });
  if (result.kind !== "accept") {
    throw new Error(`dispatch rejected: ${JSON.stringify(result, null, 2)}`);
  }
  return result.state;
}

function errorCodeOf(reject: HeartsRejectResult): string | undefined {
  return reject.errorCode;
}

function cardSuit(cardId: string): string {
  return cardId.slice(0, cardId.indexOf("-"));
}

function cardRank(cardId: string): string {
  return cardId.slice(cardId.indexOf("-") + 1);
}

function isPenalty(cardId: string): boolean {
  return cardSuit(cardId) === "hearts" || cardId === "spades-Q";
}

function choosePassCards(hand: readonly string[]): readonly string[] {
  const withoutTwoClubs = hand.filter((cardId) => cardId !== "clubs-2");
  return (withoutTwoClubs.length >= 3 ? withoutTwoClubs : hand).slice(0, 3);
}

async function passLeft(
  bundle: HeartsBundle,
  state: HeartsState,
): Promise<{
  state: HeartsState;
  passes: Array<[Player, readonly string[]]>;
}> {
  const passes: Array<[Player, readonly string[]]> = PLAYERS.map((playerId) => [
    playerId,
    choosePassCards(handOf(state, playerId)),
  ]);
  let s = state;
  for (const [playerId, cardIds] of passes) {
    s = await dispatchOrThrow(bundle, s, passInput(playerId, cardIds));
  }
  return { state: s, passes };
}

async function firstLegalCard(
  bundle: HeartsBundle,
  state: HeartsState,
  playerId: Player,
): Promise<string> {
  for (const cardId of handOf(state, playerId)) {
    const validation = await bundle.validateInput({
      state,
      input: playInput(playerId, cardId),
    });
    if (validation.valid) return cardId;
  }
  throw new Error(`no legal play for ${playerId}`);
}

describe("Hearts wave 2 — passing barrier", () => {
  test("collects four sealed passes, redistributes left, and transitions to playing", async () => {
    const { bundle, state } = await bootstrap();
    expect(currentPhase(state)).toBe("passing");

    const { state: s, passes } = await passLeft(bundle, state);

    // Barrier resolved → passing → playing transition fired.
    expect(currentPhase(s)).toBe("playing");

    // Hand sizes preserved at 13.
    for (const pid of PLAYERS) {
      expect(handOf(s, pid).length).toBe(13);
    }

    // Pass-left redistribution. Player 2 should now hold the three cards
    // they received from player 1.
    const p2Hand = handOf(s, "player-2");
    for (const cardId of passes[0]![1]) {
      expect(p2Hand).toContain(cardId);
    }

    // Player 1 lost the cards they passed.
    const p1Hand = handOf(s, "player-1");
    for (const cardId of passes[0]![1]) {
      expect(p1Hand).not.toContain(cardId);
    }
  });
});

describe("Hearts wave 2 — first-trick legality", () => {
  test("projects only the 2 of clubs as eligible for the opening lead", async () => {
    const { bundle, state } = await bootstrap();
    const { state: afterPass4 } = await passLeft(bundle, state);

    const leader = afterPass4.domain.flow.activePlayers[0] as Player;
    expect(handOf(afterPass4, leader)).toContain("clubs-2");

    const projection = seatProjectionSchema.parse(
      bundle.projectSeatsDynamic({
        state: afterPass4,
        playerIds: [leader],
      }),
    );
    const playCard = projection.seats[leader]!.availableInteractions.find(
      (interaction) => interaction.interactionKey === "playing.playCard",
    );
    const cardInput = playCard?.inputs.find((input) => input.key === "cardId");

    expect(cardInput?.domain?.eligibleTargets).toEqual(["clubs-2"]);
  });

  test("rejects a non-2-of-clubs lead on the opening trick", async () => {
    const { bundle, state } = await bootstrap();
    const { state: afterPass4 } = await passLeft(bundle, state);

    expect(currentPhase(afterPass4)).toBe("playing");
    const leader = afterPass4.domain.flow.activePlayers[0] as Player;
    expect(handOf(afterPass4, leader)).toContain("clubs-2");

    // Try to lead something other than 2♣.
    const illegalLead = handOf(afterPass4, leader).find(
      (cardId) => cardId !== "clubs-2",
    );
    expect(illegalLead).toBeDefined();
    const reject = await bundle.dispatch({
      state: afterPass4,
      input: playInput(leader, illegalLead!),
    });
    expect(reject.kind === "reject").toBe(true);
    const errorCode =
      reject.kind === "reject" ? errorCodeOf(reject) : undefined;
    expect(errorCode).toBe("INVALID_CARD_PLAY");
  });

  test("rejects penalty cards on the opening trick when alternatives exist", async () => {
    const { bundle, state } = await bootstrap();
    let s = (await passLeft(bundle, state)).state;
    const leader = s.domain.flow.activePlayers[0] as Player;
    s = await dispatchOrThrow(bundle, s, playInput(leader, "clubs-2"));

    let checkedPenalty = false;
    for (let plays = 0; plays < 3; plays += 1) {
      const active = s.domain.flow.activePlayers[0] as Player;
      const hand = handOf(s, active);
      const penalty = hand.find(isPenalty);
      const hasNonPenalty = hand.some((cardId) => !isPenalty(cardId));
      if (penalty && hasNonPenalty) {
        const reject = await bundle.dispatch({
          state: s,
          input: playInput(active, penalty),
        });
        expect(reject.kind === "reject").toBe(true);
        const errorCode =
          reject.kind === "reject" ? errorCodeOf(reject) : undefined;
        expect(errorCode).toBe("INVALID_CARD_PLAY");
        checkedPenalty = true;
        break;
      }
      s = await dispatchOrThrow(
        bundle,
        s,
        playInput(active, await firstLegalCard(bundle, s, active)),
      );
    }
    expect(checkedPenalty).toBe(true);
  });
});

describe("Hearts wave 2 — follow-suit & hearts-not-broken", () => {
  test("rejects an off-suit play when the lead suit is held", async () => {
    const { bundle, state } = await bootstrap();
    let s = (await passLeft(bundle, state)).state;
    const leader = s.domain.flow.activePlayers[0] as Player;
    s = await dispatchOrThrow(bundle, s, playInput(leader, "clubs-2"));

    let checkedFollowSuit = false;
    for (let plays = 0; plays < 3; plays += 1) {
      const active = s.domain.flow.activePlayers[0] as Player;
      const hand = handOf(s, active);
      const offSuit = hand.find((cardId) => cardSuit(cardId) !== "clubs");
      if (hand.some((cardId) => cardSuit(cardId) === "clubs") && offSuit) {
        const reject = await bundle.dispatch({
          state: s,
          input: playInput(active, offSuit),
        });
        expect(reject.kind === "reject").toBe(true);
        const errorCode =
          reject.kind === "reject" ? errorCodeOf(reject) : undefined;
        expect(errorCode).toBe("INVALID_CARD_PLAY");
        checkedFollowSuit = true;
        break;
      }
      s = await dispatchOrThrow(
        bundle,
        s,
        playInput(active, await firstLegalCard(bundle, s, active)),
      );
    }
    expect(checkedFollowSuit).toBe(true);
  });
});

describe("Hearts wave 2 — full hand", () => {
  test("auto-plays a legal hand to scoring and starts the second round", async () => {
    const { bundle, state } = await bootstrap();
    let s: HeartsState = state;

    s = (await passLeft(bundle, s)).state;
    expect(currentPhase(s)).toBe("playing");

    // Drive every play by trying each card in the active player's hand and
    // dispatching the first one validate accepts. This exercises the full
    // legality cascade (follow-suit, hearts-broken, first-trick) without
    // hand-scripting 52 plays.
    let plays = 0;
    while (currentPhase(s) === "playing") {
      const active = s.domain.flow.activePlayers[0] as Player | undefined;
      if (!active) throw new Error("no active player while playing");
      const hand = handOf(s, active);
      let dispatched = false;
      for (const cardId of hand) {
        const input = playInput(active, cardId);
        const validation = await bundle.validateInput({ state: s, input });
        if (validation.valid) {
          s = await dispatchOrThrow(bundle, s, input);
          dispatched = true;
          plays += 1;
          break;
        }
      }
      if (!dispatched) {
        throw new Error(
          `no legal play for ${active}, hand=${JSON.stringify(hand)}`,
        );
      }
      if (plays > 60) throw new Error("infinite loop guard");
    }

    // 13 tricks × 4 plays = 52 cards played.
    expect(plays).toBe(52);

    // playing → scoreHand → setup → passing chains synchronously when nobody
    // has reached 100 points yet.
    expect(currentPhase(s)).toBe("passing");

    // Every penalty card has been awarded somewhere. Hearts (13) + Q♠ (13)
    // = 26 raw points. With shoot-the-moon the totals invert to 78 across
    // the three non-shooters.
    const publicState = publicStateSchema.parse(s.domain.publicState);
    const points = publicState.pointsThisHand;
    const total = Object.values(points).reduce((a, b) => a + b, 0);
    const moon = publicState.moonShooter;
    expect(total).toBe(moon ? 78 : 26);
    expect(publicState.roundNumber).toBe(2);
    expect(publicState.totalPointsByPlayer).toEqual(points);

    // Second-round hands have been redealt from the recycled discard pile.
    for (const pid of PLAYERS) {
      expect(handOf(s, pid).length).toBe(13);
    }

    // Hand-scoped trick state has reset for the next passing barrier.
    expect(publicState.heartsTakenByPlayer).toEqual({});
    expect(publicState.tricksWonByPlayer).toEqual({});
    expect(publicState.heartsBroken).toBe(false);
    expect(publicState.isFirstTrick).toBe(true);
  });
});

describe("Hearts wave 2 — trick resolution", () => {
  test("highest card of lead suit wins the trick and leads next", async () => {
    const { bundle, state } = await bootstrap();
    let s = (await passLeft(bundle, state)).state;
    const plays: Array<{ playerId: Player; cardId: string }> = [];

    for (let i = 0; i < 4; i += 1) {
      const active = s.domain.flow.activePlayers[0] as Player;
      const cardId = await firstLegalCard(bundle, s, active);
      plays.push({ playerId: active, cardId });
      s = await dispatchOrThrow(bundle, s, playInput(active, cardId));
    }

    const leadSuit = cardSuit(plays[0]!.cardId);
    let expectedWinner = plays[0]!.playerId;
    let winningRank = -1;
    for (const play of plays) {
      if (cardSuit(play.cardId) !== leadSuit) continue;
      const rank = RANK_ORDER[cardRank(play.cardId)] ?? 0;
      if (rank > winningRank) {
        winningRank = rank;
        expectedWinner = play.playerId;
      }
    }

    const publicState = publicStateSchema.parse(s.domain.publicState);
    expect(publicState.tricksWonByPlayer[expectedWinner]).toBe(1);
    expect(s.domain.flow.activePlayers).toEqual([expectedWinner]);
    expect(publicState.isFirstTrick).toBe(false);
  });
});
