export const requiredWorkbenchScenarioIds = Object.freeze([
  "automa-river-rival.claim-cargo.mobile",
  "automa-river-rival.claim-cargo.duplicate.mobile",
  "automa-river-rival.claim-cargo.initial.mobile",
  "automa-river-rival.claim-cargo.live-update.mobile",
  "automa-river-rival.claim-cargo.reconnect.mobile",
  "automa-river-rival.claim-cargo.terminal.mobile",
  "deck-building-market.buy-card.desktop",
  "hearts.pass-three.mobile",
  "hex-network-trading.place-route.desktop",
  "multiplayer-ranking-and-ties.draft-stall.desktop",
  "multiplayer-ranking-and-ties.draft-stall.reconnect.desktop",
  "multiplayer-ranking-and-ties.draft-stall.tie-break.desktop",
  "multiplayer-ranking-and-ties.draft-stall.true-tie.desktop",
  "multiplayer-ranking-and-ties.draft-stall.unique-winner.desktop",
  "roll-and-write-scorecard.mark-cell.drafted.mobile",
  "roll-and-write-scorecard.mark-cell.initial.mobile",
  "roll-and-write-scorecard.mark-cell.invalid.mobile",
  "roll-and-write-scorecard.mark-cell.mobile",
  "roll-and-write-scorecard.mark-cell.rolled.mobile",
  "roll-and-write-scorecard.mark-cell.submitted.mobile",
  "roll-and-write-scorecard.mark-cell.terminal.mobile",
  "simultaneous-card-drafting.lock-choice.mobile",
  "solo-countdown-puzzle.repair-beacon.initial.mobile",
  "solo-countdown-puzzle.repair-beacon.live-update.mobile",
  "solo-countdown-puzzle.repair-beacon.mobile",
  "solo-countdown-puzzle.repair-beacon.reconnect.mobile",
  "solo-countdown-puzzle.repair-beacon.terminal.mobile",
  "worker-placement-tableau.place-worker.desktop",
]);

export const requiredParityScenarioIds = Object.freeze([
  "hearts.pass-three.mobile",
]);

export const requiredReferenceGameIds = Object.freeze([
  ...new Set(requiredWorkbenchScenarioIds.map((id) => id.split(".")[0])),
]);
