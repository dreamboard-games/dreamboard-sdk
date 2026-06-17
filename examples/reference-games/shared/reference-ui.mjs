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
        "main",
        {
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
