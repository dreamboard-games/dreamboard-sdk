import { defineGameDefinition as defineGame } from "@dreamboard-games/sdk/reducer/advanced";
import { gameContract } from "./game-contract";
import { createInitialPublicState } from "./model";
import { phases } from "./phases";
import { playerView, sharedView } from "./player-view";
import setupProfiles from "./setup-profiles";

export default defineGame({
  contract: gameContract,
  initial: {
    public: () => createInitialPublicState(),
    private: () => ({}),
    hidden: () => ({}),
  },
  initialPhase: "roll",
  setupProfiles,
  phases,
  views: {
    shared: sharedView,
    player: playerView,
  },
});
