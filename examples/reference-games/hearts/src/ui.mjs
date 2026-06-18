import { createReferenceGameRoot } from "../../shared/reference-ui.mjs";

export const Root = createReferenceGameRoot({
  id: "hearts",
  scenarioId: "hearts.pass-three.mobile",
  displayName: "Hearts",
  interaction: "pass-three",
  interactionMode: "select",
  cardInputKey: "cardIds",
  selectionCount: 3,
  actionLabel: "Pass three cards",
  summary: "Select and pass three private cards.",
  mobile: true,
  cards: [
    { id: "two-clubs", name: "Two of Clubs", properties: { icon: "2C" } },
    {
      id: "queen-spades",
      name: "Queen of Spades",
      properties: { icon: "QS" },
    },
    {
      id: "ace-hearts",
      name: "Ace of Hearts",
      properties: { icon: "AH" },
    },
    {
      id: "seven-diamonds",
      name: "Seven of Diamonds",
      properties: { icon: "7D" },
    },
    { id: "ten-clubs", name: "Ten of Clubs", properties: { icon: "10C" } },
  ],
});
