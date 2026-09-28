import { z } from "zod";
import { createGame, many } from "../src/reducer.js";

const model = createGame({
  manifest: {
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [],
    zones: [],
  },
  options: z.object({}),
  phases: { play: z.object({}) },
  state: {
    public: z.object({}),
    private: z.object({}),
    hidden: z.object({}),
  },
});
const play = model.phase("play");

const picks = many(
  play.inputs.form.choice({
    choices: [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ],
    defaultValue: () => undefined,
  }),
  { min: 1, max: 2, distinct: true },
);
const valid: z.infer<typeof picks.schema> = ["a", "b"];
// @ts-expect-error many(choice) takes an array, not the inner scalar.
const scalar: z.infer<typeof picks.schema> = "a";
void [valid, scalar];

import type { CoreInstance } from "../src/headless/model.js";
const definition = model.assemble({
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      interactions: {
        choose: play.interaction({
          inputs: {
            picks,
            list: play.inputs.form.choiceList({
              choices: [{ value: "a", label: "A" }],
              defaultValue: [],
            }),
            array: { kind: "form", schema: z.array(z.literal("x")) },
          },
          reduce() {},
        }),
      },
    }),
  },
  view: model.view(() => ({})),
});
declare const instance: CoreInstance<typeof definition>;
const manyInput = instance.inputs.get("play.choose", "picks");
manyInput.getSelectHandler("a");
manyInput.setValue(["a", "b"]);
// @ts-expect-error A many input selects individual members.
manyInput.getSelectHandler(["a"]);
const arrayInput = instance.inputs.get("play.choose", "array");
arrayInput.getSelectHandler(["x"]);
arrayInput.setValue(["x"]);
// @ts-expect-error Plain array schemas do not acquire many-selection semantics.
arrayInput.getSelectHandler("x");

const listInput = instance.inputs.get("play.choose", "list");
listInput.getSelectHandler("a");
listInput.setValue(["a"]);
// @ts-expect-error Choice-list domains also select members, not arrays.
listInput.getSelectHandler(["a"]);
