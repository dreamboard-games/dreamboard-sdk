import { defineEmptyView } from "@dreamboard-games/sdk/reducer";
import { defineGameDefinition as defineGame } from "@dreamboard-games/sdk/reducer/advanced";
import { gameContract } from "./game-contract";
import { phases } from "./phases";
import { playerView } from "./player-view";
import { setupProfiles, shuffle } from "../shared/manifest-contract";

export default defineGame({
  contract: gameContract,
  initial: {
    public: ({ playerIds }) => ({
      round: 1,
      pick: 1,
      totalScoreByPlayer: Object.fromEntries(
        playerIds.map((playerId) => [playerId, 0]),
      ),
      roundScoreByPlayer: {},
      roundHistory: [],
      outcome: null,
    }),
    private: () => ({}),
    hidden: () => ({}),
  },
  initialPhase: "setup",
  setupProfiles: setupProfiles({
    standard: {
      initialPhase: "setup",
      bootstrap: [shuffle({ type: "sharedZone", zoneId: "market-deck" })],
    },
  }),
  phases,
  views: {
    shared: defineEmptyView<typeof gameContract>(),
    player: playerView,
  },
});
