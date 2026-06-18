import React from "react";
import {
  Board,
  Game,
  Interaction,
  PlayerRoster,
} from "@dreamboard-games/sdk/runtime/primitives";
import { Panel, ThemeProvider } from "@dreamboard-games/sdk/ui";
import { DREAMBOARD_PLUGIN_PROTOCOL_VERSION } from "@dreamboard-games/plugin-runtime-contract";
import coverage from "../scenarios/coverage.json" with { type: "json" };

const referenceGameId = "roll-and-write-scorecard";
const seededRolls = [
  { round: 1, dice: [2, 3], total: 5 },
  { round: 2, dice: [4, 3], total: 7 },
  { round: 3, dice: [6, 4], total: 10 },
  { round: 4, dice: [1, 5], total: 6 },
  { round: 5, dice: [3, 6], total: 9 },
  { round: 6, dice: [2, 2], total: 4 },
  { round: 7, dice: [5, 3], total: 8 },
  { round: 8, dice: [6, 5], total: 11 },
];
const scorecard = {
  boardId: "survey-grid",
  cells: [
    [2, 5, 8, 11],
    [6, 9, 3, 7],
    [10, 4, 12, 6],
    [7, 11, 5, 9],
  ].flatMap((rowTargets, row) =>
    rowTargets.map((target, col) => ({
      id: `cell-${row}-${col}`,
      row,
      col,
      target,
    })),
  ),
};
const activeRoll = seededRolls[0];
const activeScenario = {
  phase: "markSurvey",
  marks: {
    "player-1": {},
  },
};

const scorecardBoard = {
  id: scorecard.boardId,
  layout: "square",
  spaces: Object.fromEntries(
    scorecard.cells.map(({ id, row, col, target }) => {
      return [
        id,
        {
          id,
          row,
          col,
          typeId: null,
          fields: { target },
        },
      ];
    }),
  ),
  edges: [],
  vertices: [],
  pieces: [],
};

function markForCell(cellId) {
  return activeScenario.marks["player-1"][cellId] ?? "empty";
}

function targetForCell(cellId) {
  return scorecard.cells.find((cell) => cell.id === cellId)?.target;
}

function cellId(row, col) {
  return `cell-${row}-${col}`;
}

function renderMarkLabel(mark) {
  if (mark === "empty") return "";
  if (mark.kind === "surveyed") return String(mark.rolledTotal);
  if (mark.kind === "failed") return "X";
  return "";
}

function ScorecardCell({ row, col }) {
  const id = cellId(row, col);
  const mark = markForCell(id);
  const eligible = coverage.replay.eligibleSpaceIds.includes(id);
  return React.createElement(
    "g",
    {
      "data-scorecard-cell": id,
      "data-scorecard-mark": mark === "empty" ? mark : mark.kind,
    },
    React.createElement("rect", {
      width: 44,
      height: 44,
      rx: 4,
      fill: eligible ? "#eef7ff" : "#f8fafc",
      stroke: mark === "empty" ? "#94a3b8" : "#334155",
      strokeWidth: eligible ? 2 : 1,
    }),
    React.createElement(
      "text",
      {
        x: 22,
        y: 28,
        textAnchor: "middle",
        fontFamily: "system-ui, sans-serif",
        fontSize: 16,
        fill: "#0f172a",
        pointerEvents: "none",
      },
      renderMarkLabel(mark),
    ),
    mark === "empty"
      ? React.createElement(
          "text",
          {
            x: 22,
            y: 16,
            textAnchor: "middle",
            fontFamily: "system-ui, sans-serif",
            fontSize: 11,
            fill: "#475569",
            pointerEvents: "none",
          },
          targetForCell(id),
        )
      : null,
  );
}

function ScorecardGrid() {
  return React.createElement(
    Interaction.Root,
    { interaction: "mark-cell" },
    React.createElement(
      Board.Root,
      null,
      React.createElement(Board.SquareGrid, {
        board: scorecardBoard,
        cellSize: 48,
        showCoordinates: true,
        coordinateStyle: "numeric",
        renderCell: (row, col) =>
          React.createElement(ScorecardCell, { row, col }),
        renderPiece: () => null,
        renderInteractiveSpace: (_space, state) =>
          state.selected
            ? React.createElement("rect", {
                width: 48,
                height: 48,
                fill: "rgba(14, 165, 233, 0.18)",
                stroke: "#0284c7",
                strokeWidth: 3,
              })
            : null,
      }),
      React.createElement(
        Panel.Actions,
        null,
        React.createElement(Interaction.Submit, null, "Mark cell"),
      ),
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
          { style: { width: "min(100%, 540px)", margin: "0 auto" } },
          React.createElement(
            Panel.Header,
            null,
            React.createElement(Panel.Title, null, "Cloudline Survey"),
            React.createElement(
              Panel.Description,
              { "data-reference-phase": state.phase ?? "none" },
              `Roll ${activeRoll.dice.join(" + ")} = ${activeRoll.total}. Choose one matching unmarked cell.`,
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
            React.createElement(ScorecardGrid),
          ),
        ),
      ),
    ),
  );
}
