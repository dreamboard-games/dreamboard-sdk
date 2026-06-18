import React from "react";
import {
  Game,
  Interaction,
  PlayerRoster,
} from "@dreamboard-games/sdk/runtime/primitives";
import { GameEventLog, Panel, ThemeProvider } from "@dreamboard-games/sdk/ui";
import { DREAMBOARD_PLUGIN_PROTOCOL_VERSION } from "@dreamboard-games/plugin-runtime-contract";
import coverage from "../scenarios/coverage.json" with { type: "json" };
import { scenarioMetadata } from "./reference-game.mjs";

const referenceGameId = "automa-river-rival";
const preview = scenarioMetadata.claimHighest.result.state;

function RiverCard({ card }) {
  return React.createElement(
    "div",
    {
      style: {
        border: "1px solid #cbd5e1",
        borderRadius: 6,
        padding: 8,
        background: "#f8fafc",
      },
    },
    React.createElement("strong", null, `${card.kind} ${card.value}`),
    React.createElement("div", null, card.id),
  );
}

function RiverPreview() {
  return React.createElement(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 8,
      },
    },
    scenarioMetadata.claimHighest.initial.riverCards.map((card) =>
      React.createElement(RiverCard, { key: card.id, card }),
    ),
  );
}

export function Root() {
  return React.createElement(
    ThemeProvider,
    { reducedMotion: "force" },
    React.createElement(Game.Root, null, (state) =>
      React.createElement(
        Game.Viewport,
        {
          className: "min-w-0",
          "data-reference-game": referenceGameId,
          "data-reference-scenario": coverage.scenarioId,
          "data-plugin-runtime-protocol": DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
        },
        React.createElement(
          Panel.Root,
          { style: { width: "min(100%, 520px)", margin: "0 auto" } },
          React.createElement(
            Panel.Header,
            null,
            React.createElement(Panel.Title, null, "River Guild"),
            React.createElement(
              Panel.Description,
              { "data-reference-phase": state.phase ?? "none" },
              "Claim one river cargo. The rival resolves as reducer-owned events.",
            ),
          ),
          React.createElement(
            Panel.Body,
            null,
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
            React.createElement(RiverPreview),
            React.createElement(
              Interaction.Root,
              { interaction: "claim-cargo" },
              React.createElement(
                Panel.Actions,
                null,
                React.createElement(
                  Interaction.Submit,
                  { params: {} },
                  "Claim cargo",
                ),
              ),
            ),
            React.createElement(GameEventLog, {
              events: preview.events.map((event, index) => ({
                ...event,
                version: 2,
                index,
              })),
              maxVisible: 4,
            }),
          ),
        ),
      ),
    ),
  );
}
