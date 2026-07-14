import { authoring } from "./authoring";
import { boardStatic } from "./board-static";
import { phases } from "./phases";
import { playerView, sharedView } from "./player-view";

export default authoring.game({
  initial: {
    public: () => ({
      setup: { playerIndex: 0, pendingIntersectionId: null },
      activePlayerIndex: 0,
      turnNumber: 1,
      lastRoll: null,
      lastProduction: [],
      discardCountsByPlayerId: {},
      currentTrade: null,
      tradeHistory: [],
      lastSteal: null,
      history: [],
      outcome: null,
    }),
    private: () => ({
      lastDiscard: null,
      lastStolenResourceId: null,
    }),
    hidden: () => ({}),
  },
  initialPhase: "setupCamp",
  phases,
  views: { shared: sharedView, player: playerView },
  staticView: boardStatic,
});
