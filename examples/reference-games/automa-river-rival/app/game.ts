import { defineGame } from "@dreamboard-games/sdk/reducer";
import { setupProfiles, shuffle } from "../shared/manifest-contract";
import { gameContract } from "./game-contract";
import { phases } from "./phases";
import { playerView, sharedView } from "./player-view";

export default defineGame({
  contract: gameContract,
  initial: {
    public: () => ({
      round: 1,
      activeHumanIndex: 0,
      rivalProgress: 0,
      procedureEvents: [],
      outcome: null,
    }),
    private: () => ({}),
    hidden: () => ({}),
  },
  initialPhase: "setup",
  setupProfiles: setupProfiles({
    standard: {
      initialPhase: "setup",
      bootstrap: [
        shuffle({ type: "sharedZone", zoneId: "cargo-deck" }),
        shuffle({ type: "sharedZone", zoneId: "instruction-deck" }),
      ],
    },
  }),
  phases,
  views: {
    shared: sharedView,
    player: playerView,
  },
});
