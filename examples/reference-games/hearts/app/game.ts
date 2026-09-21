import { defineGameDefinition as defineGame } from "@dreamboard-games/sdk/reducer/advanced";
import type { PlayerId } from "../shared/manifest-contract";
import { gameContract } from "./game-contract";
import { phases } from "./phases";
import { playerView, sharedView } from "./player-view";
import setupProfiles from "./setup-profiles";

export default defineGame({
  contract: gameContract,
  initial: {
    public: ({ playerIds }) => ({
      playerIds: playerIds as PlayerId[],
      heartsBroken: false,
      tricksCompleted: 0,
      capturedHeartsByPlayer: Object.fromEntries(
        playerIds.map((playerId) => [playerId, 0]),
      ),
      queenOfSpadesCapturedBy: null,
      tricksWonByPlayer: Object.fromEntries(
        playerIds.map((playerId) => [playerId, 0]),
      ),
      trickHistory: [],
      pointsByPlayer: Object.fromEntries(
        playerIds.map((playerId) => [playerId, 0]),
      ),
      moonShooter: null,
      completed: false,
      outcome: null,
    }),
    private: () => ({}),
    hidden: () => ({}),
  },
  initialPhase: "setup",
  setupProfiles,
  phases,
  views: {
    shared: sharedView,
    player: playerView,
  },
});
