import { defineGame } from "@dreamboard-games/sdk/reducer";
import { gameContract } from "./game-contract";
import { phases } from "./phases";
import { createInitialHiddenState, createInitialPublicState } from "./rules";
import { playerView, sharedView } from "./player-view";

export default defineGame({
  contract: gameContract,
  initial: {
    public: createInitialPublicState,
    private: () => ({}),
    hidden: createInitialHiddenState,
  },
  initialPhase: "setup",
  setupProfiles: {
    standard: { initialPhase: "setup", bootstrap: [] },
  },
  phases,
  views: {
    shared: sharedView,
    player: playerView,
  },
});
