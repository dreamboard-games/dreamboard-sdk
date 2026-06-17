import { createReferenceGameRoot } from "../../shared/reference-ui.mjs";

export const Root = createReferenceGameRoot({
  id: "hex-network-trading",
  scenarioId: "hex-network-trading.place-route.desktop",
  displayName: "Hex Network Trading",
  interaction: "place-route",
  actionLabel: "Place route",
  summary: "Extend the network toward a trading connection.",
  interactionMode: "drag",
  cardInputKey: "routeCardId",
  cards: [
    {
      id: "route-card",
      cardType: "route",
      name: "Route",
      playable: true,
      properties: { subtitle: "Network link" },
    },
  ],
  dropTargets: [
    {
      kind: "edge",
      id: "forest-ore",
      label: "Forest to Ore",
    },
    {
      kind: "edge",
      id: "ore-river",
      label: "Ore to River",
    },
  ],
  resources: [
    { type: "lumber", label: "Lumber", icon: "L", count: 2 },
    { type: "fiber", label: "Fiber", icon: "F", count: 1 },
    { type: "ore", label: "Ore", icon: "O", count: 1 },
  ],
});
