import { defineGame } from "@dreamboard-games/sdk/reducer";
import { gameContract } from "./game-contract";
import { phases } from "./phases";
import { playerView } from "./player-view";
import setupProfiles from "./setup-profiles";

export default defineGame({
  contract: gameContract,
  initial: {
    public: () => ({
      roundNumber: 1,
      heartsTakenByPlayer: {},
      queenTakenBy: null,
      tricksWonByPlayer: {},
      heartsBroken: false,
      isFirstTrick: true,
      pointsThisHand: {},
      totalPointsByPlayer: {},
      moonShooter: null,
    }),
    private: () => ({}),
    hidden: () => ({}),
  },
  initialPhase: "setup",
  setupProfiles,
  phases,
  views: {
    player: playerView,
  },
});
