import { defineGame } from "@dreamboard-games/sdk/reducer";
import { gameContract, type PlayerId } from "./game-contract";
import { phases } from "./phases";
import { playerView, sharedView } from "./player-view";
import { createInitialHiddenState, createInitialPublicState } from "./rules";

export default defineGame({
  contract: gameContract,
  initial: {
    public: ({ playerIds }) =>
      createInitialPublicState(playerIds as readonly PlayerId[]),
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
