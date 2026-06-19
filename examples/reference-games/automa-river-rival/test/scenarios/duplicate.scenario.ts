import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "automa-river-rival.claim-cargo.duplicate",
  description: "Duplicate delivery preserves committed rival events.",
  tags: ["duplicate-protection", "system-events"],
  claimId: "duplicate-claim",
});
