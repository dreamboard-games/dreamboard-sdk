import type { ViewCard } from "@dreamboard-games/sdk/types";
import type {
  CardId,
  CardType,
  PlayingCardsCardProperties,
} from "../shared/manifest-contract";
import type { GameContract } from "./game-contract";
import { defineView } from "@dreamboard-games/sdk/reducer";

type PlayingCardView = ViewCard<CardId, CardType, PlayingCardsCardProperties>;

export const playerView = defineView<GameContract>()({
  project({ state, playerId, q }) {
    const viewCard = (cardId: CardId): PlayingCardView => {
      const card = q.card.get(cardId);
      const props = card.properties;
      const label =
        props.rank && props.suit
          ? `${props.rank} of ${props.suit}`
          : (card.name ?? cardId);
      return {
        id: card.id,
        cardType: card.cardType,
        name: label,
        properties: props,
      };
    };
    const hand = q.zone.playerCards(playerId, "hand").map(viewCard);
    const currentTrick = q.zone.sharedCards("current-trick").map(viewCard);

    return {
      currentPhase: state.flow.currentPhase,
      roundNumber: state.publicState.roundNumber,
      hand,
      handCount: hand.length,
      currentTrick,
      heartsBroken: state.publicState.heartsBroken,
      isFirstTrick: state.publicState.isFirstTrick,
      tricksWonByPlayer: state.publicState.tricksWonByPlayer,
      pointsThisHand: state.publicState.pointsThisHand,
      totalPointsByPlayer: state.publicState.totalPointsByPlayer,
      moonShooter: state.publicState.moonShooter,
      activePlayers: state.flow.activePlayers,
    };
  },
});
