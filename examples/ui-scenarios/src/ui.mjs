import React from "react";
import {
  Game,
  Interaction,
  PlayerRoster,
} from "@dreamboard-games/sdk/runtime/primitives";
import {
  CostDisplay,
  DiceRoller,
  GameEndDisplay,
  Panel,
  PhaseIndicator,
  ResourceCounter,
  ThemeProvider,
} from "@dreamboard-games/sdk/ui";

const e = React.createElement;

const resourceDefs = [
  { type: "wood", label: "Wood" },
  { type: "stone", label: "Stone" },
  { type: "coin", label: "Coin" },
];

function titleForInteraction(key) {
  return key
    .split(".")
    .at(-1)
    .replace(/-/g, " ")
    .replace(/^\w/, (char) => char.toUpperCase());
}

function renderResources(view) {
  if (!view.resources) return null;
  return e(
    React.Fragment,
    null,
    e(
      ResourceCounter.Root,
      { resources: resourceDefs, counts: view.resources },
      e(
        ResourceCounter.Item,
        null,
        e(ResourceCounter.Label),
        e(ResourceCounter.Count),
      ),
    ),
    e(CostDisplay, {
      cost: view.stagedPayment ?? { wood: 3, stone: 1 },
      currentResources: view.resources,
      resourceDefs,
    }),
  );
}

function renderDice(view) {
  if (!Array.isArray(view.dice)) return null;
  return e(DiceRoller, {
    values: view.dice.map((die) => die.value),
    diceCount: view.dice.length,
  });
}

function renderScoreboard(view) {
  if (!Array.isArray(view.scoreboard)) return null;
  const scores = view.scoreboard.map((entry) => ({
    playerId: entry.playerId,
    name: entry.playerId,
    score: entry.score,
    isWinner: view.terminalOutcome?.winnerIds?.includes(entry.playerId),
  }));
  return e(GameEndDisplay, {
    isGameOver: Boolean(view.terminalOutcome),
    scores,
    winnerMessage: view.terminalOutcome?.reason,
  });
}

function renderInteraction(key) {
  return e(
    Interaction.Root,
    { key, interaction: key, unavailable: "show" },
    e(
      "div",
      { style: { display: "grid", gap: 8 } },
      e(Interaction.Label, null, titleForInteraction(key)),
      e(Interaction.UnavailableMessage, null),
      e(Interaction.ValidationMessage, null),
      e(Interaction.Submit, { params: {} }, "Submit"),
    ),
  );
}

function ScenarioFrame({ state }) {
  const view = state.view ?? {};

  return e(
    Game.Viewport,
    {
      "data-reference-game": "ui-scenarios",
      "data-ui-scenarios-root": "",
      "data-ui-scenario-family": view.family ?? "unknown",
      style: { padding: "1rem" },
    },
    e(
      Panel.Root,
      { style: { width: "min(100%, 900px)", margin: "0 auto" } },
      e(
        Panel.Header,
        null,
        e(Panel.Title, null, view.family ?? "Protocol scenario"),
        e(
          Panel.Description,
          { "data-ui-scenario-stage": state.stage ?? "none" },
          view.status ?? view.stage ?? state.phase ?? "Protocol scenario",
        ),
      ),
      e(
        Panel.Body,
        null,
        e(PhaseIndicator, {
          currentPhase: state.phase ?? "scenario",
          isMyTurn: state.me.canAct,
          activePlayerNames: state.turn.activePlayerIds,
        }),
        e(
          PlayerRoster.Root,
          null,
          e(PlayerRoster.List, {
            children: (player) =>
              e(
                "span",
                { "data-ui-scenario-player": player.playerId },
                player.name,
              ),
          }),
        ),
        renderResources(view),
        renderDice(view),
        view.prompt
          ? e("p", { "data-ui-scenario-prompt": "" }, view.prompt.title)
          : null,
        view.boards
          ? e(
              "pre",
              {
                "data-ui-scenario-boards": "",
                style: { whiteSpace: "pre-wrap", fontSize: 12 },
              },
              JSON.stringify(view.boards, null, 2),
            )
          : null,
        e(
          "div",
          {
            style: {
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
            },
          },
          ["inspect"].map(renderInteraction),
        ),
      ),
    ),
    renderScoreboard(view),
  );
}

export function Root() {
  return e(
    ThemeProvider,
    { reducedMotion: "force" },
    e(Game.Root, null, (state) => e(ScenarioFrame, { state })),
  );
}
