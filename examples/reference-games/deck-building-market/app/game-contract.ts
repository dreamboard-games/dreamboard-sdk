import { z } from "zod";
import {
  defineGameContract,
  type ErrorCodeOfContract,
  type GameOutcome,
  type GameStateOf,
} from "@dreamboard-games/sdk/reducer";
import { ids, manifestContract } from "../shared/manifest-contract";

const historyEntrySchema = z.object({
  turn: z.number().int().positive(),
  kind: z.enum([
    "setup",
    "technique",
    "techniqueResolved",
    "actionStepEnded",
    "inspirationPlayed",
    "cardGained",
    "cleanup",
    "endCheck",
  ]),
  actorPlayerId: ids.playerId.nullable(),
  cardId: ids.cardId.nullable(),
  summary: z.string(),
});

const publicStateSchema = z.object({
  turnNumber: z.number().int().positive(),
  history: z.array(historyEntrySchema),
  outcome: z.custom<GameOutcome<PlayerId>>().nullable(),
});

const privateStateSchema = z.object({});
const hiddenStateSchema = z.object({});
export const sketchbookPhaseStateSchema = z.object({
  step: z.enum(["action", "resolve", "buy"]),
  actionsLeft: z.number().int().nonnegative(),
  buysLeft: z.number().int().nonnegative(),
  inspiration: z.number().int().nonnegative(),
  pendingTechnique: z.enum(["eraser", "studioVisit"]).nullable(),
});

export const gameContract = defineGameContract({
  manifest: manifestContract,
  state: {
    public: publicStateSchema,
    private: privateStateSchema,
    hidden: hiddenStateSchema,
  },
  phases: {
    setup: sketchbookPhaseStateSchema,
    playerTurn: sketchbookPhaseStateSchema,
    checkGameEnd: sketchbookPhaseStateSchema,
    gameOver: sketchbookPhaseStateSchema,
  },
  errors: {
    ACTION_CARD_NOT_PLAYABLE: "That Technique cannot be played now.",
    CARD_NOT_IN_HAND: "Choose a card still in your hand.",
    DUPLICATE_CARD: "Choose each card at most once.",
    ERASER_LIMIT: "Eraser may trash at most four cards.",
    INSUFFICIENT_INSPIRATION: "You cannot afford that card.",
    INVALID_BUY: "That supply card cannot be bought now.",
    NOT_AN_INSPIRATION_CARD: "Choose an Inspiration card.",
    NOT_RESOLVING_ERASER: "Eraser is not waiting for a selection.",
    NOT_RESOLVING_STUDIO_VISIT:
      "Studio Visit is not waiting for a selection.",
    NOT_TOP_CARD: "Choose the top card of a nonempty supply pile.",
    NOT_YOUR_TURN: "Not your turn.",
    NO_ACTIONS: "No actions remain.",
    NO_BUYS: "No buys remain.",
    NO_ELIGIBLE_STUDIO_VISIT_CARD:
      "No supply card costing four or less is available.",
    OVER_COST_LIMIT: "Studio Visit can gain only a card costing four or less.",
  },
});

export type GameContract = typeof gameContract;
export type GameState = GameStateOf<GameContract>;
export type GameErrorCode = ErrorCodeOfContract<GameContract>;
export type PlayerId = z.infer<typeof ids.playerId>;
export type PlayerTurnPhaseState = z.infer<
  typeof sketchbookPhaseStateSchema
>;
export type HistoryEntry = z.infer<typeof historyEntrySchema>;

export { ids };
