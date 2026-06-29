import {
  definePlayerView,
  type GameOutcome,
} from "@dreamboard-games/sdk/reducer";
import type { GameContract, ItemId } from "./game-contract";
import type { PlacementPhaseState } from "./game-contract";
import {
  literals,
  type CardId,
  type PlayerId,
  type ResourceId,
  type SpaceId,
} from "../shared/manifest-contract";

// Local mirror of the 6 known phase names. We don't import `PhaseName`
// from `shared/generated/ui-contract` because that file's type
// derivation transitively imports the game definition (which imports
// this file), so an `import` here would be a cycle. Declaring it
// locally keeps the view stand-alone; the generator independently
// derives the same union.
type PhaseName =
  | "setup"
  | "wakeup"
  | "placement"
  | "cleanup"
  | "scoring"
  | "gameOver";

// Per-player view projection.
//
// Anti-pattern audit (per goalbuddy task T002 §3 — frontier-trails
// post-mortem):
//   1. No unpopulated fields (the previous `board?` slot has been
//      removed in spirit — it never existed here).
//   2. No 1:1 mirrors of `state.publicState.*` that the host runtime
//      already serialises into `Phase.Switch` / `q.player.resources`.
//   3. Every field below is consumed somewhere in either the scenario
//      tests or the UI contract; nothing is speculative.
//
// Naming convention: snapshot fields are NOT prefixed with `my`. Fields
// that pertain only to the viewing player ARE prefixed (e.g.
// `myResources`). Per-player public maps end with `ByPlayerId`.
export type PlayerView = {
  // ── Snapshot (kept for scenario back-compat + UI top-level chrome) ───
  readonly seasonNumber: number;
  readonly enabledActionSpaces: readonly SpaceId[];
  readonly setupVariablePoolDraw: readonly SpaceId[];
  readonly turnOrderThisSeason: readonly PlayerId[];
  readonly outcome: GameOutcome<PlayerId> | null;
  /**
   * Final per-player VP totals; populated only after the scoring phase
   * runs (i.e. when `outcome` is non-null). Until then the UI
   * should use `playerVPByPlayerId` for the running counter.
   */
  readonly finalVPByPlayerId: Readonly<Record<PlayerId, number>> | null;

  // ── Phase chrome ─────────────────────────────────────────────────────
  /**
   * Convenience mirror of `state.flow.currentPhase`. The SDK already
   * serialises this into `Phase.Switch`, but exposing it on the view
   * lets the UI thread one source of truth and avoids two separate
   * `useGame()` selectors for adjacent decisions.
   */
  readonly currentPhase: PhaseName;
  /**
   * The player whose move the game is waiting on. Null in auto phases
   * (setup / cleanup / scoring / gameOver). Multi-step barriers
   * (workshop pending craft, market pending choice) shift this to the
   * barrier-owner so the UI can swap surfaces without reading raw
   * phase state.
   */
  readonly currentActorPlayerId: PlayerId | null;

  // ── Wake-up ─────────────────────────────────────────────────────────
  readonly wakeUpSelections: Readonly<Record<string, PlayerId | null>>;

  // ── Placement-phase barriers (mirrored for back-compat) ─────────────
  readonly pendingCraftBy: PlayerId | null;
  readonly pendingMarketChoiceBy: PlayerId | null;
  readonly pendingTradeChoiceBy: PlayerId | null;
  readonly pendingApothecaryChoiceBy: PlayerId | null;
  /**
   * Library: when this is non-null, the viewing player owes a
   * `chooseLibraryDiscard` submission picking which of the 2 drawn
   * apprentice cards to discard. The two card ids are surfaced for UI
   * highlighting; the kept card stays in `apprentice-hand`.
   */
  readonly myPendingLibraryDraw: readonly CardId[] | null;
  readonly forgeActiveBy: PlayerId | null;

  // ── Mat occupancy ────────────────────────────────────────────────────
  readonly matItemsByPlayerId: Readonly<
    Record<PlayerId, Readonly<Partial<Record<SpaceId, ItemId>>>>
  >;

  // ── Worker locations ─────────────────────────────────────────────────
  /** Per-owner: `byOwner[playerId][pieceId] = spaceId | null`. */
  readonly workerLocationsByPlayerId: Readonly<
    Record<PlayerId, Readonly<Record<string, SpaceId | null>>>
  >;

  // ── Tableau public state ────────────────────────────────────────────
  readonly playedPersistentApprenticesByPlayer: Readonly<
    Record<PlayerId, readonly CardId[]>
  >;

  // ── Per-player VP / resources / hand counts ─────────────────────────
  /** Running per-player VP (final scoring overwrites this with totals). */
  readonly playerVP: Readonly<Record<PlayerId, number>>;
  readonly playerVPByPlayerId: Readonly<Record<PlayerId, number>>;
  readonly resourcesByPlayerId: Readonly<
    Record<PlayerId, Readonly<Record<ResourceId, number>>>
  >;
  readonly orderHandCountByPlayerId: Readonly<Record<PlayerId, number>>;
  readonly apprenticeHandCountByPlayerId: Readonly<Record<PlayerId, number>>;
  readonly apprenticeRosterSizeByPlayerId: Readonly<Record<PlayerId, number>>;
  readonly pendingApprenticeBuysByPlayerId: Readonly<Record<PlayerId, number>>;

  // ── Viewing player ───────────────────────────────────────────────────
  readonly myResources: Readonly<Record<ResourceId, number>>;
  readonly myOrderHand: readonly CardId[];
  readonly myApprenticeHand: readonly CardId[];
};

function isWorkerOf(pieceId: string, playerId: PlayerId): boolean {
  if (pieceId === "master-p1") return playerId === "player-1";
  if (pieceId === "master-p2") return playerId === "player-2";
  if (pieceId.startsWith("apprentice-p1-")) return playerId === "player-1";
  if (pieceId.startsWith("apprentice-p2-")) return playerId === "player-2";
  return false;
}

export const playerView = definePlayerView<GameContract>()({
  project({ state, playerId, q }): PlayerView {
    const myResources = q.player.resources(playerId);
    const myOrderHand = [...q.zone.playerCards(playerId, "order-hand")];
    const myApprenticeHand = [
      ...q.zone.playerCards(playerId, "apprentice-hand"),
    ];

    // ── Per-player public projections ──────────────────────────────────
    const orderHandsByPlayer = q.zone.allPlayerCards("order-hand");
    const apprenticeHandsByPlayer = q.zone.allPlayerCards("apprentice-hand");
    const orderHandCountByPlayerId = {} as Record<PlayerId, number>;
    const apprenticeHandCountByPlayerId = {} as Record<PlayerId, number>;
    const resourcesByPlayerId = {} as Record<
      PlayerId,
      Record<ResourceId, number>
    >;
    const matItemsByPlayerId = {} as Record<
      PlayerId,
      Partial<Record<SpaceId, ItemId>>
    >;
    const workerLocationsByPlayerId = {} as Record<
      PlayerId,
      Record<string, SpaceId | null>
    >;
    for (const pid of literals.playerIds as readonly PlayerId[]) {
      orderHandCountByPlayerId[pid] =
        (orderHandsByPlayer as Record<string, readonly string[]>)[pid]
          ?.length ?? 0;
      apprenticeHandCountByPlayerId[pid] =
        (apprenticeHandsByPlayer as Record<string, readonly string[]>)[pid]
          ?.length ?? 0;
      resourcesByPlayerId[pid] = q.player.resources(pid);
      matItemsByPlayerId[pid] =
        state.publicState.matOccupancyByPlayer[pid] ?? {};
      workerLocationsByPlayerId[pid] = {};
    }
    for (const [pieceId, location] of Object.entries(
      state.publicState.workerLocations,
    )) {
      for (const pid of literals.playerIds as readonly PlayerId[]) {
        if (isWorkerOf(pieceId, pid)) {
          workerLocationsByPlayerId[pid][pieceId] = location ?? null;
          break;
        }
      }
    }

    // ── Phase chrome ───────────────────────────────────────────────────
    const placement =
      (state.phase.get("placement") as PlacementPhaseState | null) ?? null;
    const currentPhase = state.flow.currentPhase as PhaseName;
    // Auto phases (setup/cleanup/scoring/gameOver) don't have a player
    // actor — the runtime may carry stale `activePlayers` from the
    // previous phase, so we explicitly null those out for view
    // consumers. Player-input phases (wakeup/placement) honour the
    // SDK's activePlayers list.
    const isAutoPhase =
      currentPhase === "setup" ||
      currentPhase === "cleanup" ||
      currentPhase === "scoring" ||
      currentPhase === "gameOver";
    const currentActorPlayerId = isAutoPhase
      ? null
      : ((state.flow.activePlayers[0] as PlayerId | undefined) ?? null);

    // ── finalVP gate ───────────────────────────────────────────────────
    // After scoring runs, `outcome` flips off null and
    // `playerVP` has been overwritten with totals. We surface that as
    // `finalVPByPlayerId` so consumers don't have to phase-check.
    const outcome = state.publicState.outcome as GameOutcome<PlayerId> | null;
    const finalVPByPlayerId = outcome ? state.publicState.playerVP : null;

    return {
      seasonNumber: state.publicState.seasonNumber,
      enabledActionSpaces: state.publicState.enabledActionSpaces,
      setupVariablePoolDraw: state.publicState.setupVariablePoolDraw,
      turnOrderThisSeason: state.publicState.turnOrderThisSeason,
      outcome,
      finalVPByPlayerId,

      currentPhase,
      currentActorPlayerId,

      wakeUpSelections: state.publicState.wakeUpSelections,

      pendingCraftBy: placement?.pendingCraftBy ?? null,
      pendingMarketChoiceBy: placement?.pendingMarketChoiceBy ?? null,
      pendingTradeChoiceBy: placement?.pendingTradeChoiceBy ?? null,
      pendingApothecaryChoiceBy: placement?.pendingApothecaryChoiceBy ?? null,
      myPendingLibraryDraw:
        (placement?.pendingLibraryDraw?.[playerId] as
          | readonly CardId[]
          | null
          | undefined) ?? null,
      forgeActiveBy: placement?.forgeActiveBy ?? null,

      matItemsByPlayerId,

      workerLocationsByPlayerId,

      playedPersistentApprenticesByPlayer:
        state.publicState.playedPersistentApprentices,

      playerVP: state.publicState.playerVP,
      playerVPByPlayerId: state.publicState.playerVP,
      resourcesByPlayerId,
      orderHandCountByPlayerId,
      apprenticeHandCountByPlayerId,
      apprenticeRosterSizeByPlayerId: state.publicState.apprenticeRosterSize,
      pendingApprenticeBuysByPlayerId:
        state.publicState.pendingApprenticeBuysByPlayer,

      myResources,
      myOrderHand,
      myApprenticeHand,
    };
  },
});
