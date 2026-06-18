import { defineView, type GameOutcome } from "@dreamboard-games/sdk/reducer";
import type {
  GameContract,
  PlayerTurnPhaseState,
  PortType,
  PendingTrade,
  SetupPhaseState,
  Terrain,
  VertexBuilding,
  EdgeBuilding,
} from "./game-contract";
import {
  computeBankTradeRates,
  explorerGuild,
  tradeNetwork,
  portsByVertex,
  publicInfluenceByPlayer,
} from "./derived";
import {
  coloniesByVertexId,
  stormSpaceId,
  trailsByEdgeId,
} from "./reducer-support";
import {
  literals,
  type CardType,
  type EdgeId,
  type PlayerId,
  type ResourceId,
  type SpaceId,
  type VertexId,
} from "../shared/manifest-contract";

// ── Projected view types ────────────────────────────────────────────────────
//
// The view is the sole contract between the reducer and the UI. We
// declare it explicitly so the UI does not depend on inferred shapes
// that could drift silently when `publicState` / phase state / derived
// helpers change.
//
// Values that the SDK already exposes are NOT mirrored into the view:
//   - current player  -> generated `Game.Root`
//   - player order    -> generated `Game.Root` / `q.player.order()`
//   - current phase   → `Phase.Switch` / `state.flow.currentPhase`

export type PlayerViewSpace = {
  readonly id: SpaceId;
  readonly terrain: Terrain;
  readonly numberToken: number | null;
};

export type PlayerViewBoardSpace = {
  readonly id: SpaceId;
  readonly q: number;
  readonly r: number;
};

export type PlayerViewBoard = {
  readonly spaces: Readonly<Record<SpaceId, PlayerViewBoardSpace>>;
  readonly edges: readonly {
    readonly id: EdgeId;
    readonly spaceIds: readonly SpaceId[];
  }[];
  readonly vertices: readonly {
    readonly id: VertexId;
    readonly spaceIds: readonly SpaceId[];
  }[];
};

export type PlayerView = {
  // Board ----------------------------------------------------------------
  readonly board?: PlayerViewBoard;
  readonly spaces: readonly PlayerViewSpace[];
  readonly coloniesByVertexId: Readonly<Record<string, VertexBuilding>>;
  readonly trailsByEdgeId: Readonly<Record<string, EdgeBuilding>>;
  readonly portsByEdgeId: Readonly<Record<string, PortType>>;
  readonly stormSpaceId: SpaceId;

  // Turn sub-flow — `null` outside `playerTurn`.
  readonly diceRolled: boolean;
  readonly diceValues: readonly [number, number] | null;
  readonly stormPending: boolean;
  readonly discardPending: readonly PlayerId[];
  readonly pendingTrade: PendingTrade | null;
  readonly charterCardBoughtThisTurn: boolean;
  readonly charterCardPlayedThisTurn: boolean;

  // Setup sub-flow — `null` outside `setup`.
  readonly setup: SetupPhaseState | null;

  // Viewing player --------------------------------------------------------
  readonly myResources: Readonly<Record<ResourceId, number>>;
  readonly myCharterCardIds: readonly string[];
  readonly myCharterCardTypesById: Readonly<Record<string, CardType>>;
  readonly myCharterCardCount: number;
  readonly myTotalInfluence: number;
  /** Best bank trade rate per resource for the *viewing* player. */
  readonly myBankTradeRates: Readonly<Record<ResourceId, number>>;
  readonly myDiscardRequired: number;
  readonly amITargetedByTrade: boolean;
  readonly myTradeResponse: "accepted" | "rejected" | "none";

  // All-players summaries -------------------------------------------------
  readonly influenceByPlayerId: Partial<Record<PlayerId, number>>;
  readonly scoutsByPlayerId: Partial<Record<PlayerId, number>>;

  // Derived ownership -----------------------------------------------------
  readonly outcome: GameOutcome<PlayerId> | null;
  readonly tradeNetworkOwner: PlayerId | null;
  readonly tradeNetworkLength: number;
  readonly explorerGuildOwner: PlayerId | null;
  readonly explorerGuildSize: number;
};

export const playerView = defineView<GameContract>()({
  project({ state, playerId, q, derived }): PlayerView {
    const lr = derived(tradeNetwork);
    const la = derived(explorerGuild);
    const publicVp = derived(publicInfluenceByPlayer);
    const ports = derived(portsByVertex);
    const colonies = coloniesByVertexId(state, q);
    const trails = trailsByEdgeId(state, q);

    const spaces: PlayerViewSpace[] = literals.spaceIds.map((spaceId) => {
      return {
        id: spaceId,
        terrain: state.publicState.terrainBySpaceId[spaceId],
        numberToken: state.publicState.numberTokenBySpaceId[spaceId],
      };
    });
    // Charter-card chrome: UI needs display names for hand pips. Read the
    // card type from the manifest via `q.card.get` — never parse the
    // card id.
    const myCharterCardIds = [...q.zone.playerCards(playerId, "charter-hand")];
    const myCharterCardTypesById: Record<string, CardType> = {};
    for (const cardId of myCharterCardIds) {
      myCharterCardTypesById[cardId] = q.card.get(cardId).cardType;
    }

    const myTotalInfluence =
      (publicVp[playerId] ?? 0) +
      (state.publicState.landmarkCards[playerId] ?? 0);

    const myBankTradeRates = computeBankTradeRates(colonies, ports, playerId);

    const setup: SetupPhaseState | null = state.phase.get("setup");
    const turn: PlayerTurnPhaseState | null = state.phase.get("playerTurn");

    const pendingTrade = turn?.pendingTrade ?? null;
    const amITargetedByTrade =
      pendingTrade != null && pendingTrade.targetPlayerIds.includes(playerId);
    const myTradeResponse: "accepted" | "rejected" | "none" = !pendingTrade
      ? "none"
      : !amITargetedByTrade
        ? "none"
        : pendingTrade.acceptedBy.includes(playerId)
          ? "accepted"
          : pendingTrade.rejectedBy.includes(playerId)
            ? "rejected"
            : "none";

    const myDiscardRequired = turn?.discardPending.includes(playerId)
      ? Math.floor(q.player.resourceTotal(playerId) / 2)
      : 0;

    return {
      spaces,
      coloniesByVertexId: colonies,
      trailsByEdgeId: trails,
      portsByEdgeId: state.publicState.portsByEdgeId,
      stormSpaceId: stormSpaceId(state),
      diceRolled: turn?.diceRolled ?? false,
      diceValues: turn?.diceValues ?? null,
      stormPending: turn?.stormPending ?? false,
      discardPending: turn?.discardPending ?? [],
      pendingTrade,
      charterCardBoughtThisTurn: turn?.charterCardBoughtThisTurn ?? false,
      charterCardPlayedThisTurn: turn?.charterCardPlayedThisTurn ?? false,
      setup,
      myResources: q.player.resources(playerId),
      myCharterCardIds,
      myCharterCardTypesById,
      myCharterCardCount: myCharterCardIds.length,
      myTotalInfluence,
      myBankTradeRates,
      myDiscardRequired,
      amITargetedByTrade,
      myTradeResponse,
      influenceByPlayerId: publicVp,
      scoutsByPlayerId: state.publicState.scoutsDeployed,
      outcome: state.publicState.outcome,
      tradeNetworkOwner: lr.ownerPlayerId,
      tradeNetworkLength: lr.length,
      explorerGuildOwner: la.ownerPlayerId,
      explorerGuildSize: la.size,
    };
  },
});
