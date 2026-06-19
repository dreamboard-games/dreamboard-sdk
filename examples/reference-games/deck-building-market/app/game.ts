import {
  defineGame,
  type ReducerGameDefinition,
} from "@dreamboard-games/sdk/reducer";
import { gameContract, type GameContract } from "./game-contract";
import { phases } from "./phases";
import { playerView } from "./player-view";
import setupProfiles from "./setup-profiles";

const views = { player: playerView } as const;

const game: ReducerGameDefinition<GameContract, typeof phases, typeof views> =
  defineGame({
    contract: gameContract,
    initial: {
      public: () => ({ turnNumber: 1, outcome: null }),
      private: () => ({}),
      hidden: () => ({}),
    },
    initialPhase: "setup",
    setupProfiles,
    phases,
    views,
  });

export default game;
