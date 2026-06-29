import { defineEmptyView, defineGame } from "@dreamboard-games/sdk/reducer";
import { gameContract } from "./game-contract";
import { phases } from "./phases";
import { initialPublicState } from "./rules";
import { playerView } from "./player-view";
import setupProfiles from "./setup-profiles";

export default defineGame({
  contract: gameContract,
  initial: {
    public: initialPublicState,
    private: () => ({}),
    hidden: () => ({}),
  },
  initialPhase: "playerTurn",
  setupProfiles,
  phases,
  views: {
    shared: defineEmptyView<typeof gameContract>(),
    player: playerView,
  },
});
