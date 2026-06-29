import type { ViewCard } from "@dreamboard-games/sdk/types";
import type {
  CardId,
  CardProperties,
  CardType,
} from "../shared/manifest-contract";
import type { GameContract } from "./game-contract";
import { definePlayerView } from "@dreamboard-games/sdk/reducer";
import { hasChopsticksReady } from "./rules/scoring";

type SushiCardView = ViewCard<CardId, CardType, CardProperties>;

export const playerView = definePlayerView<GameContract>()({
  project({ state, playerId, q }) {
    const viewCard = (cardId: CardId): SushiCardView => {
      const card = q.card.get(cardId);
      return { ...card, name: card.name ?? cardId };
    };

    const hand = q.zone.playerCards(playerId, "hand").map(viewCard);
    const played = q.zone.playerCards(playerId, "played").map(viewCard);
    const pudding = q.zone.playerCards(playerId, "pudding").map(viewCard);

    const playerIds = q.player.order();
    const playedByPlayer: Record<string, readonly SushiCardView[]> = {};
    const puddingByPlayer: Record<string, readonly SushiCardView[]> = {};
    for (const pid of playerIds) {
      playedByPlayer[pid] = q.zone.playerCards(pid, "played").map(viewCard);
      puddingByPlayer[pid] = q.zone.playerCards(pid, "pudding").map(viewCard);
    }

    return {
      currentPhase: state.flow.currentPhase,
      round: state.publicState.round ?? 1,
      hand,
      handCount: hand.length,
      played,
      pudding,
      playedByPlayer,
      puddingByPlayer,
      totalScoreByPlayer: state.publicState.totalScoreByPlayer ?? {},
      roundScoreByPlayer: state.publicState.roundScoreByPlayer ?? {},
      puddingScoreByPlayer: state.publicState.puddingScoreByPlayer ?? {},
      outcome: state.publicState.outcome,
      canUseChopsticks: hasChopsticksReady(q, playerId),
    };
  },
});
