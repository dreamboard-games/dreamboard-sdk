import { defineGame } from "@dreamboard-games/sdk/reducer";
import { gameContract } from "./game-contract";
import { phases } from "./phases";
import { playerView } from "./player-view";
import setupProfiles from "./setup-profiles";

export default defineGame({
  contract: gameContract,
  initial: {
    public: () => ({
      round: 1,
      totalScoreByPlayer: {},
      roundScoreByPlayer: {},
      puddingScoreByPlayer: {},
      winnerPlayerIds: [],
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
