import { asPlayerId } from "@dreamboard-games/sdk/reducer";
import {
  dealToPlayerZone,
  setupProfiles,
  shuffle,
  zones,
} from "../shared/manifest-contract";

export default setupProfiles({
  standard: {
    initialPhase: "setup",
    bootstrap: [
      // Shuffle the charter card deck
      shuffle({
        type: "sharedZone",
        zoneId: "charter-deck",
      }),
    ],
  },
  "terminal-regression": {
    initialPhase: "setup",
    bootstrap: [],
  },
  "charter-verification": {
    initialPhase: "setup",
    bootstrap: [
      dealToPlayerZone({
        from: { type: "sharedZone", zoneId: "charter-deck" },
        zoneId: zones.charterHand,
        count: 25,
        playerIds: [asPlayerId("player-1")],
      }),
    ],
  },
});
