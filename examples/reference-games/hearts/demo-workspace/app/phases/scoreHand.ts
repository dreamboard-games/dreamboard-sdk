import { z } from "zod";
import type { GameContract } from "../game-contract";
import { defineEffect, definePhase } from "@dreamboard-games/sdk/reducer";
import type { CardId } from "../../shared/manifest-contract";
import { edit } from "../reducer-support";

const scoreHandPhaseStateSchema = z.object({});

const GAME_END_SCORE = 100;
const shuffleDrawPile = defineEffect<GameContract>()({
  type: "shuffleSharedZone",
  id: "shuffle-draw-pile",
});

// Auto phase: tally hand points (1 per heart, 13 for Q♠), apply
// shoot-the-moon if a single player took every penalty card, update
// cumulative score, and either end the game at 100 or recycle the discard
// pile into a fresh shuffled hand.
export const scoreHand = definePhase<GameContract>()({
  kind: "auto",
  state: scoreHandPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, fx, q }) {
    const playerIds = q.player.order();
    const hearts = state.publicState.heartsTakenByPlayer ?? {};
    const queenTakenBy = state.publicState.queenTakenBy;

    // Raw hand points.
    const raw: Record<string, number> = {};
    for (const pid of playerIds) {
      raw[pid] = hearts[pid] ?? 0;
    }
    if (queenTakenBy) {
      raw[queenTakenBy] = (raw[queenTakenBy] ?? 0) + 13;
    }

    // Shoot the moon: one player took all 13 hearts and Q♠ (= 26).
    const shooter = playerIds.find((pid) => raw[pid] === 26) ?? null;
    const pointsThisHand: Record<string, number> = {};
    if (shooter) {
      for (const pid of playerIds) {
        pointsThisHand[pid] = pid === shooter ? 0 : 26;
      }
    } else {
      for (const pid of playerIds) {
        pointsThisHand[pid] = raw[pid] ?? 0;
      }
    }

    const previousTotals = state.publicState.totalPointsByPlayer ?? {};
    const totalPointsByPlayer: Record<string, number> = {};
    for (const pid of playerIds) {
      totalPointsByPlayer[pid] =
        (previousTotals[pid] ?? 0) + (pointsThisHand[pid] ?? 0);
    }

    const gameEnded = playerIds.some(
      (pid) => (totalPointsByPlayer[pid] ?? 0) >= GAME_END_SCORE,
    );

    if (gameEnded) {
      const tx = edit(state);
      tx.patchPublicState({
        pointsThisHand,
        totalPointsByPlayer,
        moonShooter: shooter,
      });
      return accept(tx.state, { instructions: [fx.transition("gameOver")] });
    }

    const discardCards = q.zone.sharedCards("discard") as readonly CardId[];
    const tx = edit(state);
    for (const cardId of discardCards) {
      tx.moveCardBetweenSharedZones({
        fromZoneId: "discard",
        toZoneId: "draw-pile",
        cardId,
      });
    }
    tx.patchPublicState({
      roundNumber: state.publicState.roundNumber + 1,
      heartsTakenByPlayer: {},
      queenTakenBy: null,
      tricksWonByPlayer: {},
      heartsBroken: false,
      isFirstTrick: true,
      pointsThisHand,
      totalPointsByPlayer,
      moonShooter: shooter,
    });
    return accept(tx.state, {
      instructions: [
        fx.effect(shuffleDrawPile, { zoneId: "draw-pile" }),
        fx.transition("setup"),
      ],
    });
  },
});
