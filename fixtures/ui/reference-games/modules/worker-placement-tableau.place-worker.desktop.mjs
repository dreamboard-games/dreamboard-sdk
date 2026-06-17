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
  id: "worker-placement-tableau",
  scenarioId: "worker-placement-tableau.place-worker.desktop",
  displayName: "Worker Placement Tableau",
  interaction: "place-worker",
  actionLabel: "Place worker",
  summary: "Place a worker on an available tableau action.",
});

export const uiContractFingerprint = "sha256:7ead99900f9c41b0e5e8c1e9a0d06223712524b492e96f690dffacb0cfda0d2d";
