import { z } from "zod";
import { ids, manifestContract } from "../shared/manifest-contract";
import {
  defineGameContract,
  type ErrorCodeOfContract,
  type GameStateOf,
} from "@dreamboard-games/sdk/reducer";

// ── Public game state ────────────────────────────────────────────────────────
//
// Sketchbook stores only state that is:
//
//   1. Game-specific (no SDK-native home), AND
//   2. Persistent across phase boundaries and across turns.
//
// Each player's deck/hand/in-play/discard live as runtime perPlayer zones.
// Each shared supply pile is a runtime shared zone. Coin/action/buy counts
// are turn-scoped and live in `playerTurn` phase state. VP totals are
// computed in `derived.ts` from the cards a player owns.
//
// `turnNumber` increments at the start of each turn. The game-end derived
// value uses zone counts and `turnNumber` (for tiebreak).
const publicStateSchema = z.object({
  turnNumber: z.number().int().min(1).default(1),
  winnerPlayerId: ids.playerId.nullable(),
});

const privateStateSchema = z.object({});
const hiddenStateSchema = z.object({});

// ── Phase state ──────────────────────────────────────────────────────────────
//
// Setup phase has no flow state — it deals decks deterministically and
// transitions immediately into `playerTurn`.
export const setupPhaseStateSchema = z.object({});

// `playerTurn` is a single phase whose internal `step` advances within the
// turn:
//   - "action": play action cards from hand. `actionsLeft` decrements per play.
//   - "resolve": a card with follow-up choices was just played (Eraser,
//                Sketchpad, Studio Visit). Only that card's resolve interaction
//                is offered until the player commits its target selection,
//                after which the step returns to "action". `pendingAction.kind`
//                records which card is being resolved.
//   - "buy":    play treasures, gain cards from the supply.
//   - "cleanup": move hand+in-play to discard, draw 5, reshuffle if needed.
//
// `coins`, `actionsLeft`, `buysLeft` reset on every turn entry. `pendingDraw`
// is consumed by Sketchpad's two-step input (discard N, then draw N).
export type PlayerTurnStep = "action" | "resolve" | "buy" | "cleanup";

// Discriminates which freshly-played card the "resolve" step is waiting on, so
// only the matching resolve interaction is projected as available. `null`
// outside the resolve step.
export const pendingActionKindSchema = z.enum([
  "eraser",
  "sketchpad",
  "studioVisit",
]);

export const playerTurnPhaseStateSchema = z.object({
  step: z.enum(["action", "resolve", "buy", "cleanup"]),
  actionsLeft: z.number().int().min(0),
  buysLeft: z.number().int().min(0),
  coins: z.number().int().min(0),
  // Sketchpad's deferred draw: how many cards the active player has earned
  // by discarding but not yet drawn. Cleared at end of turn.
  pendingDraw: z.number().int().min(0).default(0),
  // Set when `step === "resolve"`; identifies the card whose follow-up
  // selection is pending. Reset to `null` once resolved.
  pendingAction: z
    .object({ kind: pendingActionKindSchema })
    .nullable()
    .default(null),
});

export type PendingActionKind = z.infer<typeof pendingActionKindSchema>;

export const checkGameEndPhaseStateSchema = z.object({});
export const gameOverPhaseStateSchema = z.object({});

export const gameContract = defineGameContract({
  manifest: manifestContract,
  state: {
    public: publicStateSchema,
    private: privateStateSchema,
    hidden: hiddenStateSchema,
  },
  phases: {
    setup: setupPhaseStateSchema,
    playerTurn: playerTurnPhaseStateSchema,
    checkGameEnd: checkGameEndPhaseStateSchema,
    gameOver: gameOverPhaseStateSchema,
  },
  errors: {
    ACTION_CARD_NOT_PLAYABLE: "That action card cannot be played now.",
    INSUFFICIENT_COINS: "You cannot afford that card.",
    INVALID_BUY: "That buy is not legal right now.",
    NOT_A_TREASURE: "Choose a treasure card.",
    NOT_RESOLVING_ERASER: "Eraser is not waiting for a target.",
    NOT_RESOLVING_SKETCHPAD: "Sketchpad is not waiting for a target.",
    NOT_RESOLVING_STUDIO_VISIT: "Studio Visit is not waiting for a target.",
    NOT_TOP_CARD: "Choose the top card.",
    NOT_YOUR_TURN: "Not your turn.",
    NO_ACTIONS: "No actions left.",
    NO_BUYS: "No buys left.",
    NO_TREASURES: "No treasure cards are available.",
    OVER_COST_LIMIT: "Choose a card within the allowed cost.",
    WRONG_PHASE: "Not in player turn phase.",
  },
});

export type GameContract = typeof gameContract;
export type GameState = GameStateOf<GameContract>;
export type GameErrorCode = ErrorCodeOfContract<GameContract>;
export type PublicState = z.infer<typeof publicStateSchema>;
export type SetupPhaseState = z.infer<typeof setupPhaseStateSchema>;
export type PlayerTurnPhaseState = z.infer<typeof playerTurnPhaseStateSchema>;
export type CheckGameEndPhaseState = z.infer<
  typeof checkGameEndPhaseStateSchema
>;
export type GameOverPhaseState = z.infer<typeof gameOverPhaseStateSchema>;

// Re-export the player-id schema so phase files don't need to reach into
// `manifest-contract` directly.
export { ids };
