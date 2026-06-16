import React from "react";
import { PluginRuntime } from "@dreamboard-games/sdk/runtime";

export const uiContractFingerprint =
  "sha256:c7145ddd3d6e31a6abb5846426b5450dcfad2f4494b9e96a814c2637bb25d05e";

export function Root() {
  return React.createElement(
    "section",
    {
      "data-dreamboard-ui-fixture": "deck-building-market.buy-card.desktop",
      "data-dreamboard-reference-game": "deck-building-market",
      "data-dreamboard-runtime": PluginRuntime
        ? "external-sdk-runtime"
        : "missing-runtime",
    },
    "Deck Building Market",
  );
}
