import { defineGame } from "@dreamboard-games/sdk/reducer";
import { records, setupProfiles } from "../shared/manifest-contract";
import { gameContract, type PublicState } from "./game-contract";
import { phases } from "./phases";
import { playerView, sharedView } from "./player-view";

export default defineGame({
  contract: gameContract,
  initial: {
    public: ({ playerIds }): PublicState => ({
      season: 1,
      firstPlayerId: playerIds[0]!,
      activePlayerId: playerIds[0]!,
      passedPlayerIds: [],
      workerLocations: records.pieceIds(() => null),
      tableauByPlayer: Object.fromEntries(
        playerIds.map((id) => [id, {}]),
      ) as PublicState["tableauByPlayer"],
      events: [],
      finalScoreByPlayer: null,
      outcome: null,
    }),
    private: () => ({}),
    hidden: () => ({}),
  },
  initialPhase: "setup",
  setupProfiles: setupProfiles({
    standard: { initialPhase: "setup", bootstrap: [] },
  }),
  phases,
  views: { shared: sharedView, player: playerView },
});
