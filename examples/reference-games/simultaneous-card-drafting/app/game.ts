import { defineEmptyView, defineGame } from "@dreamboard-games/sdk/reducer";
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
      outcome: null,
    }),
    private: () => ({}),
    hidden: () => ({}),
  },
  initialPhase: "setup",
  setupProfiles,
  phases,
  views: {
    shared: defineEmptyView<typeof gameContract>(),
    player: playerView,
  },
});
