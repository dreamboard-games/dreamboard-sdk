import { setupProfiles, shuffle } from "../shared/manifest-contract";

export default setupProfiles({
  default: {
    initialPhase: "setup",
    bootstrap: [shuffle({ type: "sharedZone", zoneId: "draw-pile" })],
  },
});
