import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "automa-river-rival.claim-cargo.reconnect",
  description: "Reconnect restores public rival progress and event history.",
  tags: ["reconnect", "event-log"],
  claimId: "reconnect-claim",
});
