import { createPrimitiveScenario } from "../scenario-helper.mjs";

export const scenario = createPrimitiveScenario({
  id: "ui-scenarios.game-shell.desktop",
  title: "Game shell: phase, roster, and terminal outcome",
  contracts: ["MoreActions", "PrimaryButton", "ThemedButton", "Panel"],
  sourceFiles: [
    "examples/ui-scenarios/src/game-shell/phase-roster-terminal.scenario.mjs",
  ],
  view: {
    family: "game-shell",
    title: "Game shell",
    description: "Phase, roster, responsive viewport, and terminal outcome.",
    phase: "scoring",
  },
});
