import { z } from "zod";
import { ids, manifestContract } from "../shared/manifest-contract";
import {
  defineGameContract,
  sparseCounts,
  type ErrorCodeOfContract,
  type GameStateOf,
} from "@dreamboard-games/sdk/reducer";

// Sparse counts map keyed by resource id. Used for trade offers and
// build/trade costs.
export const countsByIdSchema = sparseCounts(ids.resourceId);

// What is built on a vertex
const vertexBuildingSchema = z.object({
  ownerId: ids.playerId,
  kind: z.enum(["camp", "town"]),
});

// What is built on an edge
const edgeBuildingSchema = z.object({
  ownerId: ids.playerId,
});

// Per-player scalar counter, keyed by manifest-typed player id so that a
// missing player id is a type error at call sites.
const perPlayerCountSchema = z.record(ids.playerId, z.number().int().min(0));

export const portTypeSchema = z.enum([
  "3:1",
  "iron",
  "grain",
  "cloth",
  "timber",
  "clay",
]);
export const terrainIds = [
  "timberGrove",
  "clayPit",
  "grainField",
  "ironHills",
  "flaxMeadow",
  "badlands",
  "borderland",
] as const;
export const terrainSchema = z.enum(terrainIds);

// ── Public game state ─────────────────────────────────────────────────────────
//
// This shape is deliberately *minimal*. We store only state that is:
//
//   1. Game-specific (no SDK-native home), AND
//   2. Persistent across phase boundaries and across turns.
//
// Every other slice of state lives where it belongs:
//
//   - Current player / turn order → `state.flow.activePlayers` and
//     `q.player.order()` (seeded from the manifest).
//   - Current phase            → `state.flow.currentPhase`.
//   - Per-player resources     → `table.resources`, read via
//                                 `q.player.resources(pid)` /
//                                 `q.player.canAfford(...)`, mutated via
//                                 `tx.addResources` / `tx.spendResources` /
//                                 `tx.transferResources`.
//   - Relay slots              → manifest authored edge metadata. Shuffled
//                                 port assignments live in `portsByEdgeId`.
//   - Winner / derivations     → `app/derived.ts` (winnerOf, portsByVertex,
//                                 tradeNetwork, explorerGuild, …). The terminal
//                                 winner is latched here once `checkGameEnd`
//                                 trails to `gameOver`.
//   - Setup sub-flow counters  → `setup` phase's `state` (auto-discarded
//                                 on transition to `playerTurn`).
//   - Turn-scoped flags        → `playerTurn` phase's `state` (dice roll,
//                                 charter-card flags, storm sequence, pending
//                                 trade).
export const publicStateSchema = z.object({
  // Board terrain (shuffled per game; not available from the manifest).
  terrainBySpaceId: z.record(ids.spaceId, terrainSchema),
  numberTokenBySpaceId: z.record(ids.spaceId, z.number().nullable()),

  // Port type per relay edge. Relay edge locations are static topology;
  // the assigned port types are shuffled per game and are public information.
  portsByEdgeId: z.record(z.string(), portTypeSchema).default({}),

  // Per-player scout counts — input to the `explorerGuild` derived value
  // (see app/derived.ts). Persists across turns.
  scoutsDeployed: perPlayerCountSchema,

  // Per-player Renown charter cards (hidden until claimed). Persists across turns.
  landmarkCards: perPlayerCountSchema,

  // Terminal winner. Null until `checkGameEnd` latches the derived winner at
  // the hard end-of-turn lifecycle boundary.
  winnerPlayerId: ids.playerId.nullable(),
});

// Trade offer held in `playerTurn` phase state while responses stream in.
// `targetPlayerIds` is the set of captains the offer was actually made to;
// only those players receive a `trade-offer` prompt and can respond.
export const pendingTradeSchema = z.object({
  offeredBy: ids.playerId,
  give: countsByIdSchema,
  want: countsByIdSchema,
  targetPlayerIds: z.array(ids.playerId),
  acceptedBy: z.array(ids.playerId),
  rejectedBy: z.array(ids.playerId),
});

// ── Phase state schemas ─────────────────────────────────────────────────────
//
// These are the phase-local state shapes. The SDK resets phase state to
// `initialState()` on every `fx.transition`, so:
//
//   - All setup bookkeeping dies when we transition `setup → playerTurn`.
//   - Turn-scoped flags (dice, charter-card, storm, pending trade) live only
//     inside `playerTurn` and don't pollute the global public state.
//
// Within a single phase, phase state persists across actions until the
// author explicitly resets it (e.g. `endTurn` zeroes the turn-scoped
// flags). Reentering the same phase via `fx.transition` *does* reset it.
export const setupPhaseStateSchema = z.object({
  // Snake-draft counters. Setup rotates forwards through round 0, then
  // backwards through round 1. Exiting round 1 transitions to `playerTurn`.
  round: z.number().int().min(0).max(1),
  playerIndex: z.number().int().min(0),
  step: z.enum(["camp", "trail"]),
  placedCamp: z.boolean(),
  // Vertex of the camp placed this turn; read by `placeSetupTrail`
  // in round 1 to grant the adjacent-terrain resources, then cleared
  // when the turn advances. Null between turns.
  lastCampVertexId: ids.vertexId.nullable(),
});

export const playerTurnPhaseStateSchema = z.object({
  step: z.enum(["roll", "discard", "storm", "main"]),
  // Dice
  diceRolled: z.boolean(),
  diceValues: z
    .tuple([z.number().int().min(1).max(6), z.number().int().min(1).max(6)])
    .nullable(),
  // Charter-card flags (one buy and one play per turn)
  charterCardBoughtThisTurn: z.boolean(),
  charterCardPlayedThisTurn: z.boolean(),
  // Storm sequence: a 7-roll puts `stormPending = true` until the
  // current player calls `moveStorm`; `discardPending` holds the list of
  // players who still owe a discard before the storm can be moved.
  stormPending: z.boolean(),
  discardPending: z.array(ids.playerId),
  // In-flight player-to-player trade (null when no offer is pending).
  pendingTrade: pendingTradeSchema.nullable(),
});

export const checkGameEndPhaseStateSchema = z.object({});
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
    playerTurn: playerTurnPhaseStateSchema,
    checkGameEnd: checkGameEndPhaseStateSchema,
    gameOver: gameOverPhaseStateSchema,
  },
  errors: {
    ALREADY_PLAYED_CHARTER_CARD: "You already played a charter card this turn.",
    ALREADY_ROLLED: "Dice have already been rolled this turn.",
    BOUGHT_THIS_TURN: "You bought a charter card this turn.",
    CANNOT_TARGET_SELF: "Choose another player.",
    CHARTER_CARD_NOT_PLAYABLE: "That charter card cannot be played now.",
    DECK_EMPTY: "Charter card deck is empty.",
    DISCARDS_PENDING: "Resolve pending discards first.",
    DISTANCE_RULE: "Too close to another camp or town.",
    DUPLICATE_ROUTE_TARGET: "Choose two different trail targets.",
    DUPLICATE_TARGETS: "Choose each player once.",
    EDGE_OCCUPIED: "That edge is already occupied.",
    EMPTY_TRADE: "Offer at least one resource.",
    INSUFFICIENT_RESOURCES: "You cannot afford this action.",
    INVALID_DISCARD: "Choose valid resources to discard.",
    INVALID_ROUTE_COUNT: "Choose exactly two trail targets.",
    INVALID_ROUTE_TARGET: "Choose a valid trail target.",
    INVALID_STORM_SEIZE_TARGET: "Choose a valid storm target.",
    MUST_ROLL_FIRST: "Roll dice first.",
    NOT_CONNECTED: "Choose a connected location.",
    NOT_CONNECTED_TO_ROAD: "Choose a location connected to your trail.",
    NOT_REQUIRED_TO_DISCARD: "This player does not need to discard.",
    NO_ACCEPTED_TRADE: "No accepted trade is ready to confirm.",
    NO_PENDING_TRADE: "No trade is pending.",
    NO_SETTLEMENT: "Choose one of your camps.",
    OCEAN_EDGE: "Choose a land edge.",
    OCEAN_SPACE: "Choose a land space.",
    OCEAN_VERTEX: "Choose a land vertex.",
    PARTNER_INSUFFICIENT: "The trade partner cannot afford this trade.",
    PARTNER_NOT_ACCEPTED: "The trade partner has not accepted yet.",
    SAME_RESOURCE: "Choose two different resources.",
    SAME_SPACE: "Choose a different space.",
    SETUP_ROAD_NOT_PENDING: "Place your setup camp first.",
    SETUP_SETTLEMENT_NOT_PENDING: "Place a setup camp now.",
    STORM_NOT_PENDING: "No storm is pending.",
    STORM_PENDING: "Resolve the storm first.",
    TRADE_ALREADY_PENDING: "A trade is already pending.",
    UNKNOWN_TARGET: "Choose a valid trade partner.",
    VERTEX_OCCUPIED: "That vertex is already occupied.",
    WAITING_FOR_DISCARDS: "Waiting for discards.",
    WRONG_DISCARD_COUNT: "Discard the required number of cards.",
  },
});

export type GameContract = typeof gameContract;
export type GameState = GameStateOf<GameContract>;
export type GameErrorCode = ErrorCodeOfContract<GameContract>;
export type PublicState = z.infer<typeof publicStateSchema>;
export type PrivateState = z.infer<typeof privateStateSchema>;
export type HiddenState = z.infer<typeof hiddenStateSchema>;
export type VertexBuilding = z.infer<typeof vertexBuildingSchema>;
export type EdgeBuilding = z.infer<typeof edgeBuildingSchema>;
export type PortType = z.infer<typeof portTypeSchema>;
export type Terrain = z.infer<typeof terrainSchema>;
export type CountsById = z.infer<typeof countsByIdSchema>;
export type PendingTrade = z.infer<typeof pendingTradeSchema>;
export type SetupPhaseState = z.infer<typeof setupPhaseStateSchema>;
export type PlayerTurnPhaseState = z.infer<typeof playerTurnPhaseStateSchema>;
export type CheckGameEndPhaseState = z.infer<
  typeof checkGameEndPhaseStateSchema
>;
export type GameOverPhaseState = z.infer<typeof gameOverPhaseStateSchema>;
