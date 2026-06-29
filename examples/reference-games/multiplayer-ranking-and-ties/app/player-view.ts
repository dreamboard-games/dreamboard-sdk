import { definePlayerView } from "@dreamboard-games/sdk/reducer";
import type { GameContract } from "./game-contract";
import {
  activePlayerId,
  cardById,
  legalMarketCardIds,
} from "./phases/draft-flow";

export const playerView = definePlayerView<GameContract>()({
  project({ state, playerId }) {
    const publicState = state.publicState;
    return {
      currentPhase: state.flow.currentPhase,
      viewer: playerId,
      round: publicState.round,
      activePlayerId: activePlayerId(publicState),
      market: publicState.market.map((cardId) => cardById[cardId]),
      legalMarketCardIds: legalMarketCardIds(publicState),
      festivalRows: Object.fromEntries(
        Object.entries(publicState.festivalRows).map(
          ([rowPlayerId, cardIds]) => [
            rowPlayerId,
            cardIds.map((cardId) => cardById[cardId]),
          ],
        ),
      ),
      stormsRevealed: publicState.stormsRevealed,
      events: publicState.events,
      completed: publicState.completed,
      outcome: publicState.outcome,
    };
  },
});
