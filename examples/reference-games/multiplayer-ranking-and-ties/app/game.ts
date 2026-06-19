import { authoring } from "./authoring";
import { createInitialPublicState } from "./phases/draft-flow";
import { phases } from "./phases";
import { playerView } from "./player-view";
import setupProfiles from "./setup-profiles";

export default authoring.game({
  initial: {
    public: ({ playerIds }) => createInitialPublicState({ playerIds }),
    private: () => ({}),
    hidden: () => ({}),
  },
  initialPhase: "setup",
  setupProfiles,
  phases,
  views: {
    player: playerView,
  },
});
