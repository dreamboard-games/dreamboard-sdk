import type { PlayerId } from "./manifest";
import { hearts } from "./game-model";
import gameOver from "./phases/gameOver";
import passing from "./phases/passing";
import playing from "./phases/playing";
import scoreHand from "./phases/scoreHand";
import setup from "./phases/setup";
import { view } from "./player-view";

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
  phases: { setup, passing, playing, scoreHand, gameOver },
  view,
});
