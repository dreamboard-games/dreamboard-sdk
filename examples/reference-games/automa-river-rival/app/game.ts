import { defineGame } from "@dreamboard-games/sdk/reducer";
import { gameContract } from "./game-contract";
import { phases } from "./phases";
import { playerView } from "./player-view";
import { createInitialPublicState } from "./phases/rival-procedure";

export default defineGame({
  contract: gameContract,
  initial: {
    public: createInitialPublicState,
    private: () => ({}),
    hidden: () => ({}),
  },
  initialPhase: "setup",
  setupProfiles: {
    standard: {},
  },
  phases,
  views: {
    player: playerView,
  },
});

export {
  createInitialPublicState,
  cargoSupply,
  chooseRivalCargo,
  cooperativeOutcome,
  eventProcedureIds,
  resolveRivalProcedure,
  rivalInstructions,
  riverCards,
} from "./phases/rival-procedure";
export { claimCargoForPublicState } from "./phases/human-turn";
