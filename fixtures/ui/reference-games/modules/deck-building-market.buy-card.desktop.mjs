import React from "react";
import {
  Game,
  Interaction,
  PlayerRoster,
} from "@dreamboard-games/sdk/runtime/primitives";
import { DREAMBOARD_PLUGIN_PROTOCOL_VERSION } from "@dreamboard-games/plugin-runtime-contract";

export function createReferenceGameRoot(config) {
  return function ReferenceGameRoot() {
    return React.createElement(Game.Root, null, (state) =>
      React.createElement(
        Game.Viewport,
        {
          className: "min-w-0",
          "data-reference-game": config.id,
          "data-reference-scenario": config.scenarioId,
          "data-plugin-runtime-protocol": DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
        },
        React.createElement("h1", null, config.displayName),
        React.createElement(
          "p",
          { "data-reference-phase": state.phase ?? "none" },
          config.summary,
        ),
        React.createElement(
          PlayerRoster.Root,
          null,
          React.createElement(PlayerRoster.List, {
            children: (player) =>
              React.createElement(
                "span",
                { "data-reference-player": player.playerId },
                player.name,
              ),
          }),
        ),
        React.createElement(
          Interaction.Root,
          { interaction: config.interaction },
          React.createElement(
            Interaction.Submit,
            { params: {} },
            config.actionLabel,
          ),
        ),
      ),
    );
  };
}


export const Root = createReferenceGameRoot({
  id: "deck-building-market",
  scenarioId: "deck-building-market.buy-card.desktop",
  displayName: "Deck Building Market",
  interaction: "buy-card",
  actionLabel: "Buy market card",
  summary: "Purchase an affordable card from the market row.",
});

export const uiContractFingerprint = "sha256:c7145ddd3d6e31a6abb5846426b5450dcfad2f4494b9e96a814c2637bb25d05e";
