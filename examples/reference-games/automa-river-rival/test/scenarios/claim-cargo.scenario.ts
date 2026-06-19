import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "automa-river-rival.claim-cargo",
  description:
    "Human claim triggers deterministic claim-highest rival resolution.",
  tags: ["deterministic-procedure", "system-events"],
  claimId: "claim-cargo",
});
