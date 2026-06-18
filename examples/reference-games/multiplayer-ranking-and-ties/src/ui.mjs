import React from "react";
import {
  Game,
  Interaction,
  PlayerRoster,
} from "@dreamboard-games/sdk/runtime/primitives";
import {
  OutcomeDialog,
  Panel,
  StandingsTable,
  ThemeProvider,
} from "@dreamboard-games/sdk/ui";
import { DREAMBOARD_PLUGIN_PROTOCOL_VERSION } from "@dreamboard-games/plugin-runtime-contract";
import coverage from "../scenarios/coverage.json" with { type: "json" };

const referenceGameId = "multiplayer-ranking-and-ties";
const playerNames = {
  "player-1": "Aster",
  "player-2": "Bryn",
  "player-3": "Cato",
  "player-4": "Diem",
};

function playerName(playerId) {
  return playerNames[playerId] ?? playerId;
}

const previewCards = {
  "food-p3-c0-1": { guild: "food", prestige: 3, coins: 0 },
  "food-p3-c0-2": { guild: "food", prestige: 3, coins: 0 },
  "craft-p2-c1-1": { guild: "craft", prestige: 2, coins: 1 },
  "craft-p2-c1-2": { guild: "craft", prestige: 2, coins: 1 },
};

const completeSetTieBreakOutcome = {
  reason: { code: "SIX_ROUNDS_COMPLETE" },
  standings: [
    {
      playerId: "player-1",
      rank: 1,
      result: "win",
      score: 21,
      scoreBreakdown: [
        { id: "stall-prestige", label: "Stall prestige", value: 13 },
        { id: "guild-sets", label: "Guild sets", value: 8 },
        { id: "coin-bonus", label: "Coins", value: 0 },
      ],
      tieBreaks: [
        { id: "complete-sets", label: "Complete sets", value: 2 },
        { id: "coins", label: "Coins", value: 0 },
      ],
    },
    {
      playerId: "player-2",
      rank: 2,
      result: "loss",
      score: 21,
      scoreBreakdown: [
        { id: "stall-prestige", label: "Stall prestige", value: 17 },
        { id: "guild-sets", label: "Guild sets", value: 4 },
        { id: "coin-bonus", label: "Coins", value: 0 },
      ],
      tieBreaks: [
        { id: "complete-sets", label: "Complete sets", value: 1 },
        { id: "coins", label: "Coins", value: 0 },
      ],
    },
    {
      playerId: "player-3",
      rank: 3,
      result: "loss",
      score: 10,
      scoreBreakdown: [
        { id: "stall-prestige", label: "Stall prestige", value: 6 },
        { id: "guild-sets", label: "Guild sets", value: 4 },
        { id: "coin-bonus", label: "Coins", value: 0 },
      ],
      tieBreaks: [
        { id: "complete-sets", label: "Complete sets", value: 1 },
        { id: "coins", label: "Coins", value: 0 },
      ],
    },
  ],
};

function MarketPreview() {
  return React.createElement(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 8,
      },
    },
    coverage.replay.eligibleCardIds.map((cardId) => {
      const card = previewCards[cardId];
      return React.createElement(
        "div",
        {
          key: cardId,
          style: {
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            padding: 8,
            background: "#f8fafc",
          },
        },
        React.createElement("strong", null, `${card.guild} stall`),
        React.createElement(
          "div",
          null,
          `Prestige ${card.prestige} / Coins ${card.coins}`,
        ),
      );
    }),
  );
}

function DraftStallAction() {
  return React.createElement(
    Interaction.Root,
    { interaction: "draft-stall" },
    React.createElement(
      Panel.Actions,
      null,
      React.createElement(Interaction.Submit, { params: {} }, "Draft stall"),
    ),
  );
}

export function Root() {
  const outcome = completeSetTieBreakOutcome;
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
          { style: { width: "min(100%, 640px)", margin: "0 auto" } },
          React.createElement(
            Panel.Header,
            null,
            React.createElement(Panel.Title, null, "Harbor Fair"),
            React.createElement(
              Panel.Description,
              { "data-reference-phase": state.phase ?? "none" },
              "Draft from the shared market, then resolve final standings from the reducer outcome.",
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
            React.createElement(MarketPreview),
            React.createElement(DraftStallAction),
            React.createElement(StandingsTable, {
              rows: outcome.standings,
              playerName,
            }),
            React.createElement(OutcomeDialog, {
              outcome: state.view?.submittedInteractionId ? outcome : null,
              playerName,
            }),
          ),
        ),
      ),
    ),
  );
}
