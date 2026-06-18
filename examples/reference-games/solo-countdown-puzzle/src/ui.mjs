import React from "react";
import {
  Board,
  Game,
  Interaction,
  PlayerRoster,
} from "@dreamboard-games/sdk/runtime/primitives";
import { GameEventLog, Panel, ThemeProvider } from "@dreamboard-games/sdk/ui";
import { DREAMBOARD_PLUGIN_PROTOCOL_VERSION } from "@dreamboard-games/plugin-runtime-contract";
import coverage from "../scenarios/coverage.json" with { type: "json" };
import { beaconSpaces, scenarioMetadata } from "./reference-game.mjs";

const referenceGameId = "solo-countdown-puzzle";
const beaconBoard = {
  id: "beacon-grid",
  layout: "square",
  spaces: Object.fromEntries(
    Array.from({ length: 9 }, (_, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const id =
        beaconSpaces.find((space) => space.row === row && space.col === col)
          ?.id ?? `empty-${row}-${col}`;
      return [
        id,
        {
          id,
          row,
          col,
          typeId: null,
          fields: {},
        },
      ];
    }),
  ),
  edges: [],
  vertices: [],
  pieces: [],
};

function cellId(row, col) {
  return (
    beaconSpaces.find((space) => space.row === row && space.col === col)?.id ??
    `empty-${row}-${col}`
  );
}

function BeaconCell({ row, col }) {
  const id = cellId(row, col);
  const beacon = beaconSpaces.find((space) => space.id === id);
  const eligible = coverage.replay.eligibleSpaceIds.includes(id);
  return React.createElement(
    "g",
    { "data-beacon-cell": id },
    React.createElement("rect", {
      width: 44,
      height: 44,
      rx: 4,
      fill: eligible ? "#ecfeff" : "#f8fafc",
      stroke: eligible ? "#0891b2" : "#cbd5e1",
      strokeWidth: eligible ? 2 : 1,
    }),
    React.createElement(
      "text",
      {
        x: 22,
        y: 28,
        textAnchor: "middle",
        fontFamily: "system-ui, sans-serif",
        fontSize: 11,
        fill: "#0f172a",
        pointerEvents: "none",
      },
      beacon ? beacon.name.replace(" Beacon", "") : "",
    ),
  );
}

function BeaconGrid() {
  return React.createElement(
    Interaction.Root,
    { interaction: "repair-beacon" },
    React.createElement(
      Board.Root,
      null,
      React.createElement(Board.SquareGrid, {
        board: beaconBoard,
        cellSize: 44,
        renderCell: (row, col) => React.createElement(BeaconCell, { row, col }),
        renderPiece: () => null,
      }),
    ),
    React.createElement(
      Panel.Actions,
      null,
      React.createElement(Interaction.Submit, null, "Repair beacon"),
    ),
  );
}

export function Root() {
  const projectedEvents = scenarioMetadata.repair.state.events.map(
    (event, index) => ({
      ...event,
      version: 1,
      index,
    }),
  );
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
            React.createElement(Panel.Title, null, "Last Light"),
            React.createElement(
              Panel.Description,
              { "data-reference-phase": state.phase ?? "none" },
              "Repair a beacon, then inspect the deterministic weather and countdown events.",
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
            React.createElement(BeaconGrid),
            React.createElement(GameEventLog, {
              events: projectedEvents,
              maxVisible: 3,
            }),
          ),
        ),
      ),
    ),
  );
}
