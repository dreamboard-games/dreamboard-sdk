import type { ViewCard } from "@dreamboard-games/sdk/types";
import type {
  CardId,
  CardProperties,
  CardType,
} from "../shared/manifest-contract";
import type { GameContract } from "./game-contract";
import { definePlayerView } from "@dreamboard-games/sdk/reducer";

type MarketCardView = ViewCard<CardId, CardType, CardProperties>;

export const playerView = definePlayerView<GameContract>()({
  project({ state, playerId, q }) {
    const viewCard = (cardId: CardId): MarketCardView => {
      const card = q.card.get(cardId);
      return { ...card, name: card.name ?? cardId };
    };
    const playerIds = q.player.order();
    const cardsByPlayer = (zoneId: "stall" | "scored-history") =>
      Object.fromEntries(
        playerIds.map((id) => [
          id,
          q.zone.playerCards(id, zoneId).map(viewCard),
        ]),
      );
    return {
      currentPhase: state.flow.currentPhase,
      round: state.publicState.round,
      pick: state.publicState.pick,
      hand: q.zone.playerCards(playerId, "hand").map(viewCard),
      handCountByPlayer: Object.fromEntries(
        playerIds.map((id) => [id, q.zone.playerCards(id, "hand").length]),
      ),
      stallByPlayer: cardsByPlayer("stall"),
      scoredHistoryByPlayer: cardsByPlayer("scored-history"),
      totalScoreByPlayer: state.publicState.totalScoreByPlayer,
      roundScoreByPlayer: state.publicState.roundScoreByPlayer,
      roundHistory: state.publicState.roundHistory,
      outcome: state.publicState.outcome,
    };
  },
});
