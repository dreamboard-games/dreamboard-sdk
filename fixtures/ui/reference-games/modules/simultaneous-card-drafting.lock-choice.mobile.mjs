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
  id: "simultaneous-card-drafting",
  scenarioId: "simultaneous-card-drafting.lock-choice.mobile",
  displayName: "Simultaneous Card Drafting",
  interaction: "lock-choice",
  actionLabel: "Lock choice",
  summary: "Lock a private draft choice before reveal.",
});

export const uiContractFingerprint = "sha256:4016f48a07fa5246662cf0a7a833868c5ac3f71319d1f40fa74a104a747fd3d7";
