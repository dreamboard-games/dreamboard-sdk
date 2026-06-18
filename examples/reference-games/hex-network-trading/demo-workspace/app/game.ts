import { authoring } from "./authoring";
import { boardStatic } from "./board-static";
import { phases } from "./phases";
import setupProfiles from "./setup-profiles";
import { playerView } from "./player-view";
import { canonicalBoardSetup } from "./board-randomization";

const views = {
  player: playerView,
};

const game = authoring.game({
  initial: {
    public: ({ playerIds, setup }) => {
      // Per-player book-keeping used by derived helpers (explorer guild,
      // hidden Renown). Resources themselves live in `table.resources`, which
      // the SDK auto-seeds to zero from the manifest's `resourceIds`.
      const scoutsDeployed: Record<string, number> = {};
      const landmarkCards: Record<string, number> = {};
      for (const pid of playerIds) {
        scoutsDeployed[pid] = 0;
        landmarkCards[pid] =
          setup?.profileId === "terminal-regression" && pid === playerIds[0]
            ? 10
            : 0;
      }

      const boardSetup = canonicalBoardSetup();

      return {
        ...boardSetup,
        scoutsDeployed,
        landmarkCards,
        outcome: null,
      };
    },
    private: () => ({}),
    hidden: () => ({}),
  },
  initialPhase: "setup",
  setupProfiles,
  phases,
  views,
  staticView: boardStatic,
});

export default game;
