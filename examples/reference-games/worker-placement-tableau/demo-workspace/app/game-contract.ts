import { z } from "zod";
import { ids, manifestContract } from "../shared/manifest-contract";
import {
  defineGameContract,
  sparseCounts,
  type ErrorCodeOfContract,
  type GameStateOf,
} from "@dreamboard-games/sdk/reducer";

// ── Sparse counts and item enum ──────────────────────────────────────────────
//
// Resource counts (wood, stone, coin) live in `table.resources`, seeded by the
// SDK. `sparseCounts` is reserved here for any per-resource bag we need to
// model on top of that — e.g. trade offers in future phases. We keep it
// available for symmetry with frontier-trails.
export const countsByIdSchema = sparseCounts(ids.resourceId);

// Crafted-item kinds. Items are runtime-only (no manifest representation);
// they live in `matOccupancyByPlayer[playerId][cellSpaceId]`.
export const itemIdSchema = z.enum([
  "workbench",
  "anvil",
  "loom",
  "kiln",
  "showroom",
]);

// Per-player scalar counter, keyed by manifest-typed player id.
const perPlayerCountSchema = z.record(ids.playerId, z.number().int().min(0));

const matOccupancyByPlayerSchema = z.record(
  ids.playerId,
  z.partialRecord(ids.spaceId, itemIdSchema),
);

// ── Public game state ────────────────────────────────────────────────────────
export const publicStateSchema = z.object({
  // Variable-pool draw: the 9 active action spaces (6 fixed + 3 variable
  // chosen at setup). Stored as space ids so eligibility checks can read
  // a single field instead of recomputing.
  enabledActionSpaces: z.array(ids.spaceId),
  // The 3 variable space ids drawn at setup (subset of enabledActionSpaces),
  // retained so UI can render which variable spaces are live this game.
  setupVariablePoolDraw: z.array(ids.spaceId),

  // Worker placement state. Workers are SDK pieces (apprentice-* / master-*).
  // `workerLocations[componentId] = spaceId` when placed; `null` when in
  // the player's available roster. `null` is also the default before setup
  // attaches the initial 2 apprentices + 1 master.
  workerLocations: z.record(ids.pieceId, ids.spaceId.nullable()),

  // Apprentice roster sizes (active apprentices owned, max 4). Starts at 2.
  // Master count is implicit (always 1 per player) so not tracked here.
  apprenticeRosterSize: perPlayerCountSchema,
  // Training-Hall buys queued for next cleanup (resolve at season boundary).
  pendingApprenticeBuysByPlayer: perPlayerCountSchema,

  // Workshop-mat occupancy: playerId -> board-local cellSpaceId -> itemId.
  matOccupancyByPlayer: matOccupancyByPlayerSchema,

  // Persistent apprentice cards in each player's tableau (card ids).
  playedPersistentApprentices: z.record(ids.playerId, z.array(ids.cardId)),

  // Wake-up bidding: slotIndex (string-keyed) → playerId | null. Reset each
  // season at cleanup.
  wakeUpSelections: z.record(z.string(), ids.playerId.nullable()),

  // Season counter. The game ends when season 6 wraps to scoring.
  seasonNumber: z.number().int().min(1).max(6),
  // Turn order for the current season, derived from wake-up selections.
  turnOrderThisSeason: z.array(ids.playerId),

  // VP earned from fulfilled orders during play. Final scoring (item VP,
  // adjacency bonuses, coin) is applied during the scoring phase.
  playerVP: perPlayerCountSchema,

  // Terminal winner. Null until scoring latches the result.
  winnerPlayerId: ids.playerId.nullable(),
});

// ── Phase state schemas ──────────────────────────────────────────────────────
export const setupPhaseStateSchema = z.object({
  step: z.enum([
    "draw-spaces",
    "deal-hands",
    "seed-resources",
    "place-workers",
  ]),
});

export const wakeupPhaseStateSchema = z.object({
  step: z.enum(["select-slot"]),
  pendingPlayerIds: z.array(ids.playerId),
});

export const placementPhaseStateSchema = z.object({
  activePlayerIndex: z.number().int().min(0),
  passedPlayerIds: z.array(ids.playerId),
  // Multi-step interaction barriers. When non-null, the named player owes
  // the runtime a routed choice (`craftAtWorkshop` for workshop, or
  // `chooseMarketAction` for the market alt branch). Cleared by the
  // routed reducer when the choice resolves.
  pendingCraftBy: ids.playerId.nullable(),
  pendingMarketChoiceBy: ids.playerId.nullable(),
  // ── One-shot apprentice card flags ──────────────────────────────────────
  // Spare Hands: while a player id is in this list, that player may place
  // one extra apprentice this season (over their normal roster cap). The
  // entry is consumed on the next successful placement of an apprentice.
  spareHandsActiveBy: z.array(ids.playerId),
  // Inspiration: while non-null, the named player may invoke
  // `craftAtWorkshop` without first placing a worker on workshop, and
  // the wood cost of the chosen item is reduced by 1 (min 0). Cleared
  // after the next successful craft (or at season end via cleanup).
  inspirationActiveBy: ids.playerId.nullable(),
  // Tireless Master: when a player carrying the persistent
  // "tireless-master" card places their master, we record the space
  // here. At the start of that player's NEXT placement turn the
  // master is recalled (workerLocations[masterId] = null, the recorded
  // space is vacated) so they may place it again as that turn's
  // action. The entry is cleared once the recall fires; the season's
  // cleanup also clears any leftover entry.
  tirelessMasterPendingRecall: z.record(ids.playerId, ids.spaceId.nullable()),
  // ── Variable-pool barriers (T210) ───────────────────────────────────────
  // Trade-post: player chose 2 resources to give and 2 to receive (no
  // like-for-like). The routed `chooseTradePostExchange` interaction
  // resolves the swap.
  pendingTradeChoiceBy: ids.playerId.nullable(),
  // Forge: while non-null, the named player may invoke `craftAtWorkshop`
  // without a worker, with a -1 stone discount. Cleared on the next
  // successful craft.
  forgeActiveBy: ids.playerId.nullable(),
  // Library: when a player places on the library space, the runtime
  // draws 2 apprentice cards into a pending list and the player must
  // pick one to discard via `chooseLibraryDiscard`. The kept card is
  // committed to their hand. Keyed by playerId; null when no draw is
  // outstanding.
  pendingLibraryDraw: z.record(ids.playerId, z.array(ids.cardId).nullable()),
  // Apothecary: while non-null, the named player must `recallWorker`
  // one of their already-placed workers (pure recall — no replace).
  pendingApothecaryChoiceBy: ids.playerId.nullable(),
});

export const cleanupPhaseStateSchema = z.object({});
export const scoringPhaseStateSchema = z.object({});
export const gameOverPhaseStateSchema = z.object({});

export const privateStateSchema = z.object({});
export const hiddenStateSchema = z.object({});

export const gameContract = defineGameContract({
  manifest: manifestContract,
  state: {
    public: publicStateSchema,
    private: privateStateSchema,
    hidden: hiddenStateSchema,
  },
  phases: {
    setup: setupPhaseStateSchema,
    wakeup: wakeupPhaseStateSchema,
    placement: placementPhaseStateSchema,
    cleanup: cleanupPhaseStateSchema,
    scoring: scoringPhaseStateSchema,
    gameOver: gameOverPhaseStateSchema,
  },
  errors: {
    APPRENTICE_CARD_NOT_PLAYABLE: "That apprentice card cannot be played now.",
    APPRENTICE_NOT_IN_HAND: "You do not hold that apprentice card.",
    CANNOT_AFFORD_ITEM: "You cannot afford that item.",
    CELL_NOT_CRAFTABLE: "You cannot craft that item on that mat cell.",
    CELL_OCCUPIED: "That mat cell already holds an item.",
    DECK_TOO_SHALLOW: "The deck does not have enough cards.",
    INSPIRATION_ALREADY_ACTIVE: "Inspiration is already active.",
    INSUFFICIENT_COIN_FOR_TRAINING_HALL: "Training Hall costs coin.",
    MUST_BE_CORNER: "This item must go on a corner cell.",
    MUST_TOUCH_ONE: "This item must touch at least one other item you own.",
    MUST_TOUCH_TWO: "This item must touch at least two other items you own.",
    NOT_AN_ORDER_CARD: "That card is not an Order card.",
    NOT_A_MAT_CELL: "You can only craft on workshop-mat cells.",
    NOT_A_DRAWN_CARD: "Choose one of the drawn cards.",
    NOT_A_PLAYABLE_APPRENTICE_CARD:
      "That apprentice card cannot be played now.",
    NOT_A_WAKE_UP_SLOT: "Pick a wake-up-track slot.",
    NOT_REASSIGN_CARD: "Choose the Reassign apprentice card.",
    NOT_YOUR_WORKER: "You can only use your own workers.",
    NO_CRAFT_OPTION: "You cannot craft any item right now.",
    NO_FULFILLABLE_ORDER: "You have no order that can be fulfilled.",
    NO_PENDING_APOTHECARY: "You don't have a pending apothecary recall.",
    NO_PENDING_CRAFT: "You don't have a pending workshop craft.",
    NO_PENDING_LIBRARY: "You don't have a pending library discard.",
    NO_PENDING_MARKET: "You don't have a pending market choice.",
    NO_PENDING_TRADE: "You don't have a pending trade-post choice.",
    NO_PLACEABLE_WORKER: "You have no worker that can be placed.",
    NO_PLAYABLE_APPRENTICE: "You have no apprentice card that can be played.",
    NO_REASSIGN_OPTION: "You cannot reassign a worker.",
    NO_STONE_TO_SELL: "You do not have stone to sell.",
    ORDER_NOT_IN_HAND: "You do not hold that order card.",
    ORDER_REQUIREMENT_NOT_MET: "That order cannot be fulfilled yet.",
    PENDING_CHOICE_REQUIRED: "Resolve the pending choice first.",
    PERSISTENT_ALREADY_IN_TABLEAU:
      "That persistent apprentice is already in your tableau.",
    REASSIGN_NOT_IN_HAND: "You do not hold the Reassign apprentice card.",
    REASSIGN_SAME_SPACE: "Choose a different destination space.",
    ROSTER_EXHAUSTED: "All of your trained apprentices are already placed.",
    SLOT_ALREADY_TAKEN: "That wake-up slot is already taken.",
    SPACE_NOT_ENABLED: "That action space is not active this game.",
    SPACE_NOT_ON_ACTION_BOARD: "Choose a space on the action board.",
    SPACE_OCCUPIED: "That space already has a worker.",
    SPARE_HANDS_ALREADY_ACTIVE: "Spare Hands is already active.",
    TRADE_POST_LIKE_FOR_LIKE: "Trade post exchanges cannot be like-for-like.",
    TRADE_POST_TOTALS:
      "Trade post exchanges must give and receive two resources.",
    UNHANDLED_APPRENTICE_CARD: "Unknown apprentice card.",
    USE_REASSIGN_INTERACTION: "Use the reassign interaction for this card.",
    WAKEUP_NOT_ACTIVE: "Wake-up phase is not active.",
    WORKER_ALREADY_PLACED: "That worker is already on the board.",
    WORKER_CANNOT_PLACE_THERE:
      "That worker cannot be placed on that action space.",
    WORKER_CANNOT_REASSIGN_THERE:
      "That worker cannot be reassigned to that action space.",
    WORKER_NOT_PLACED:
      "Choose one of your workers already on the action board.",
  },
});

export type GameContract = typeof gameContract;
export type GameState = GameStateOf<GameContract>;
export type GameErrorCode = ErrorCodeOfContract<GameContract>;
export type PublicState = z.infer<typeof publicStateSchema>;
export type PrivateState = z.infer<typeof privateStateSchema>;
export type HiddenState = z.infer<typeof hiddenStateSchema>;
export type ItemId = z.infer<typeof itemIdSchema>;
export type CountsById = z.infer<typeof countsByIdSchema>;
export type SetupPhaseState = z.infer<typeof setupPhaseStateSchema>;
export type WakeupPhaseState = z.infer<typeof wakeupPhaseStateSchema>;
export type PlacementPhaseState = z.infer<typeof placementPhaseStateSchema>;
export type CleanupPhaseState = z.infer<typeof cleanupPhaseStateSchema>;
export type ScoringPhaseState = z.infer<typeof scoringPhaseStateSchema>;
export type GameOverPhaseState = z.infer<typeof gameOverPhaseStateSchema>;
