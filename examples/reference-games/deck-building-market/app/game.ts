import { defineGame } from "@dreamboard-games/sdk/reducer";
import { gameContract } from "./game-contract";
import { phases } from "./phases";
import { playerView, sharedView } from "./player-view";

export default defineGame({
  contract: gameContract,
  initial: {
    public: () => ({ turnNumber: 1, history: [], outcome: null }),
    private: () => ({}),
    hidden: () => ({}),
  },
  initialPhase: "setup",
  phases,
  views: { shared: sharedView, player: playerView },
});
