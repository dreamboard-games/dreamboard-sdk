import { shuffle } from "@dreamboard-games/sdk/reducer/advanced";
import { manifestContract } from "./manifest";
export default {
  default: {
    initialPhase: "setup",
    bootstrap: [
      shuffle<typeof manifestContract>({
        type: "sharedZone",
        zoneId: "draw-pile",
      }),
    ],
  },
} as const;
