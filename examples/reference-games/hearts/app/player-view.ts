import type { ViewCard } from "@dreamboard-games/sdk/types";
import type {
  CardId,
  CardType,
  PlayerId,
  PlayingCardsCardProperties,
} from "./manifest";
import { hearts, type GameState } from "./game-model";

type PlayingCardView = ViewCard<CardId, CardType, PlayingCardsCardProperties>;

function cardView(
  q: typeof hearts.types.Queries,
  cardId: CardId,
): PlayingCardView {
  const card = q.card.get(cardId);
  const properties = card.properties;
  return {
    id: card.id,
    cardType: card.cardType,
    name:
      properties.rank && properties.suit
        ? `${properties.rank} of ${properties.suit}`
        : (card.name ?? card.id),
    properties,
  };
}

function projectPublic(state: GameState, q: typeof hearts.types.Queries) {
  const playerIds = q.player.order() as readonly PlayerId[];
  const playing = state.phase.get("playing");
  return {
    currentPhase: state.flow.currentPhase,
    playerIds,
    activePlayerId: (state.flow.activePlayers[0] ?? null) as PlayerId | null,
    handCountByPlayer: Object.fromEntries(
      playerIds.map((playerId) => [
        playerId,
        q.zone.playerCards(playerId, "hand").length,
      ]),
    ) as Record<PlayerId, number>,
    currentTrick: playing?.plays.map(({ cardId }) => cardView(q, cardId)) ?? [],
    currentTrickPlays:
      playing?.plays.map(({ playerId, cardId }) => ({ playerId, cardId })) ??
      [],
    heartsBroken: state.publicState.heartsBroken,
    isFirstTrick: state.publicState.tricksCompleted === 0,
    tricksCompleted: state.publicState.tricksCompleted,
    capturedHeartsByPlayer: state.publicState.capturedHeartsByPlayer,
    queenOfSpadesCapturedBy: state.publicState.queenOfSpadesCapturedBy,
    tricksWonByPlayer: state.publicState.tricksWonByPlayer,
    trickHistory: state.publicState.trickHistory,
    pointsByPlayer: state.publicState.pointsByPlayer,
    moonShooter: state.publicState.moonShooter,
    completed: state.publicState.completed,
    outcome: state.publicState.outcome,
  };
}
export const view = hearts.view(({ state, playerId, q }) => {
  return {
    ...projectPublic(state, q),
    playerId,
    hand: q.zone
      .playerCards(playerId, "hand")
      .map((cardId) => cardView(q, cardId)),
  };
});
