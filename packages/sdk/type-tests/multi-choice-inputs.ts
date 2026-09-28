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
