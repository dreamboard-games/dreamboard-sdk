import { createReferenceGameRoot } from "../../shared/reference-ui.mjs";

export const Root = createReferenceGameRoot({
  id: "deck-building-market",
  scenarioId: "deck-building-market.buy-card.desktop",
  displayName: "Deck Building Market",
  interaction: "buy-card",
  actionLabel: "Buy market card",
  summary: "Purchase an affordable card from the market row.",
});
