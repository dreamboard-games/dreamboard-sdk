import { compileManifest } from "../src/reducer/manifest/compiler.js";
import { z } from "zod";
import { createGame, many } from "../src/reducer.js";
import { createGameInstance } from "../src/headless/instance.js";
import type { CommandSource } from "../src/headless/sources/types.js";

const model = createGame({
  manifest: compileManifest({
    players: { minPlayers: 1, maxPlayers: 1 },
    cardSets: [],
    zones: [],
  }),
  phases: { "setup.round": z.object({}), play: z.object({}) },
  state: {
    public: z.object({}),
    private: z.object({}),
    hidden: z.object({}),
  },
});
const setup = model.phase("setup.round");
const play = model.phase("play");
const definition = model.assemble({
  initial: { public: () => ({}) },
  initialPhase: "setup.round",
  phases: {
    "setup.round": setup.define({
      kind: "player",
      initialState: () => ({}),
      interactions: {
        "choose.option": setup.interaction({
          inputs: {
            choices: many(
              setup.inputs.form.choice({
                choices: [
                  { value: "a", label: "A" },
                  { value: "b", label: "B" },
                ] as const,
                defaultValue: () => undefined,
              }),
              { min: 1, max: 2, distinct: true },
            ),
          },
          reduce() {},
        }),
      },
    }),
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      interactions: {
        "choose.option": play.interaction({
          inputs: {},
          reduce() {},
        }),
      },
    }),
  },
  view: model.view(() => ({})),
});
declare const source: CommandSource;
const game = createGameInstance<typeof definition>()({ source });
const choose = game.interactions.get("setup.round.choose.option");
const phase: "setup.round" = choose.phase;
const id: "choose.option" = choose.id;
const choices = choose.getInput("choices");
const kind: "form" = choices.kind;
const values: readonly ("a" | "b")[] | undefined = choices.getValue();
const targets: readonly ("a" | "b")[] = choices.getEligibleTargets();
choices.setValue(["a", "b"]);
choices.getSelectHandler("a");
// @ts-expect-error The many collector accepts individual targets, not arrays.
choices.getSelectHandler(["a"]);
// @ts-expect-error Dotted phase names retain literal choice values.
choices.setValue(["invalid"]);
// @ts-expect-error Dotted phase names retain exact input keys.
choose.getInput("invalid");
const playChoose = game.interactions.get("play.choose.option");
const playPhase: "play" = playChoose.phase;
const playId: "choose.option" = playChoose.id;
// @ts-expect-error Matching interaction IDs do not share another phase's inputs.
playChoose.getInput("choices");
void [phase, id, kind, values, targets, playPhase, playId];
