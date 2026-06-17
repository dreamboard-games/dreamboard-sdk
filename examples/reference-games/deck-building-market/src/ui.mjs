import { createReferenceGameRoot } from "../../shared/reference-ui.mjs";

export const Root = createReferenceGameRoot({
  id: "deck-building-market",
  scenarioId: "deck-building-market.buy-card.desktop",
  displayName: "Deck Building Market",
  interaction: "buy-card",
  actionLabel: "Buy market card",
  summary: "Purchase an affordable card from the market row.",
  cards: [
    {
      id: "map-maker",
      name: "Map Maker",
      properties: { cost: "3 coins", effect: "Draw a route card." },
    },
    {
      id: "archive",
      name: "Archive",
      properties: { cost: "4 coins", effect: "Keep one extra card." },
    },
    {
      id: "guild-contact",
      name: "Guild Contact",
      properties: { cost: "2 coins", effect: "Discount the next buy." },
    },
  ],
});
