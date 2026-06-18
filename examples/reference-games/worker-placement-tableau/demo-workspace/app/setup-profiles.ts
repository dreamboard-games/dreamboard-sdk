import { setupProfiles, shuffle } from "../shared/manifest-contract";

// Bootstrap is intentionally minimal at T040. The variable-pool space draw
// (3 of 6), initial hand deal (1 Order + 1 Apprentice / player), starting
// resource grant, and initial worker placement all live in the setup phase.
export default setupProfiles({
  standard: {
    initialPhase: "setup",
    bootstrap: [
      shuffle({ type: "sharedZone", zoneId: "order-deck" }),
      shuffle({ type: "sharedZone", zoneId: "apprentice-deck" }),
    ],
  },
  "test-fixed-spaces": {
    initialPhase: "setup",
    bootstrap: [
      shuffle({ type: "sharedZone", zoneId: "order-deck" }),
      shuffle({ type: "sharedZone", zoneId: "apprentice-deck" }),
    ],
  },
  "test-end-game": {
    initialPhase: "setup",
    bootstrap: [],
  },
});
