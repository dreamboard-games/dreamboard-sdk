import { stormtrail } from "./game-model";
import discardBarrier from "./phases/discard-barrier";
import gameOver from "./phases/game-over";
import main from "./phases/main";
import moveBandits from "./phases/move-bandits";
import pendingTrade from "./phases/pending-trade";
import roll from "./phases/roll";
import setupCamp from "./phases/setup-camp";
import setupTrail from "./phases/setup-trail";
import { view } from "./player-view";
export default stormtrail.assemble({
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
  phases: {
    setupCamp,
    setupTrail,
    roll,
    discardBarrier,
    moveBandits,
    main,
    pendingTrade,
    gameOver,
  },
  view,
});
