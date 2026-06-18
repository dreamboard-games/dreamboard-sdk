import { setupProfiles, shuffle } from "../shared/manifest-contract";

export default setupProfiles({
  "default-setup": {
    initialPhase: "setup",
    bootstrap: [shuffle({ type: "sharedZone", zoneId: "draw-pile" })],
  },
});
