import {
  definePlayerView,
  defineSharedView,
  type TableQueriesOfState,
} from "@dreamboard-games/sdk/reducer";
import type { PlayerId } from "../shared/manifest-contract";
import { portfolioScores } from "./derived";
import type { GameContract, GameState, PlayerTurnPhaseState } from "./game-contract";
import { SUPPLY_ZONE_IDS } from "./model";

function publicProjection(
  state: GameState,
  q: TableQueriesOfState<GameState>,
  scores: Record<PlayerId, number>,
) {
  const phase: PlayerTurnPhaseState | null =
    state.flow.currentPhase === "playerTurn" ? state.phase : null;
  const playerIds = q.player.order();
  return {
    currentPhase: state.flow.currentPhase,
    activePlayerId: state.flow.activePlayers[0] ?? null,
    turnNumber: state.publicState.turnNumber,
    step: phase?.step ?? null,
    actionsLeft: phase?.actionsLeft ?? 0,
    buysLeft: phase?.buysLeft ?? 0,
    inspiration: phase?.inspiration ?? 0,
    pendingTechnique: phase?.pendingTechnique ?? null,
    handCountByPlayerId: Object.fromEntries(
      playerIds.map((playerId) => [
        playerId,
        q.zone.playerCards(playerId, "hand").length,
      ]),
    ) as Record<PlayerId, number>,
    deckCountByPlayerId: Object.fromEntries(
      playerIds.map((playerId) => [
        playerId,
        q.zone.playerCards(playerId, "deck").length,
      ]),
    ) as Record<PlayerId, number>,
    discardCardsByPlayerId: Object.fromEntries(
      playerIds.map((playerId) => [
        playerId,
        [...q.zone.playerCards(playerId, "discard")],
      ]),
    ),
    inPlayCardsByPlayerId: Object.fromEntries(
      playerIds.map((playerId) => [
        playerId,
        [...q.zone.playerCards(playerId, "in-play")],
      ]),
    ),
    supplyCountByZoneId: Object.fromEntries(
      SUPPLY_ZONE_IDS.map((zoneId) => [
        zoneId,
        q.zone.sharedCards(zoneId).length,
      ]),
    ),
    supplyTopCardByZoneId: Object.fromEntries(
      SUPPLY_ZONE_IDS.flatMap((zoneId) => {
        const cardId = q.zone.sharedCards(zoneId)[0];
        return cardId ? [[zoneId, cardId] as const] : [];
      }),
    ),
    trashCards: [...q.zone.sharedCards("trash")],
    portfolioScores: scores,
    history: state.publicState.history,
    outcome: state.publicState.outcome,
  };
}

export const sharedView = defineSharedView<GameContract>()({
  project({ state, q, derived }) {
    return publicProjection(state, q, derived(portfolioScores));
  },
});

export const playerView = definePlayerView<GameContract>()({
  project({ state, playerId, q, derived }) {
    return {
      ...publicProjection(state, q, derived(portfolioScores)),
      playerId,
      myHand: [...q.zone.playerCards(playerId, "hand")],
    };
  },
});
