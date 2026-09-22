import type { PlayerId } from "../shared/manifest-contract";
import { hearts } from "./game-model";
import gameOver from "./phases/gameOver";
import passing from "./phases/passing";
import playing from "./phases/playing";
import scoreHand from "./phases/scoreHand";
import setup from "./phases/setup";
import { playerView, sharedView } from "./player-view";
import setupProfiles from "./setup-profiles";

export default hearts.assemble({
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
  phases: { setup, passing, playing, scoreHand, gameOver },
  views: { shared: sharedView, player: playerView },
});
