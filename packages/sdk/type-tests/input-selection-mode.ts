import { compileManifest } from "../src/reducer/manifest/compiler.js";
import { z } from "zod";
import { createGame, many } from "../src/reducer.js";
import type { InputBase, ReadModel } from "../src/headless/model.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

const model = createGame({
  manifest: compileManifest({
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [],
    zones: [],
  }),
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
  phases: { play: z.object({}) },
});
const play = model.phase("play");
const choice = play.inputs.form.choice({
  choices: [{ value: "ready", label: "Ready" }],
  defaultValue: "ready",
});
const definition = model.assemble({
  initial: { public: () => ({}), private: () => ({}), hidden: () => ({}) },
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      interactions: {
        single: play.interaction({ inputs: { choice }, reduce: () => {} }),
        many: play.interaction({
          inputs: { choice: many(choice, { min: 1 }) },
          reduce: () => {},
        }),
        list: play.interaction({
          inputs: {
            choice: play.inputs.form.choiceList({
              choices: [{ value: "ready", label: "Ready" }],
              defaultValue: ["ready"],
            }),
          },
          reduce: () => {},
        }),
      },
    }),
  },
  view: () => ({}),
});
declare const game: ReadModel<typeof definition>;
const single = game.interactions.get("play.single").getInput("choice");
const multiple = game.interactions.get("play.many").getInput("choice");
const list = game.interactions.get("play.list").getInput("choice");
type SingleMode = Expect<Equal<typeof single.selectionMode, "single">>;
type ManyMode = Expect<Equal<typeof multiple.selectionMode, "many">>;
type ListMode = Expect<Equal<typeof list.selectionMode, "many">>;

declare const mixedKey: "play.single" | "play.many";
const mixed = game.interactions.get(mixedKey).getInput("choice");
type MixedMode = Expect<Equal<typeof mixed.selectionMode, "single" | "many">>;
const singlePossible: typeof mixed.selectionMode = "single";
const manyPossible: typeof mixed.selectionMode = "many";
// @ts-expect-error A union interaction key cannot promise single selection.
const alwaysSingle: "single" = mixed.selectionMode;
// @ts-expect-error A union interaction key cannot promise many selection.
const alwaysMany: "many" = mixed.selectionMode;

declare const listKey: "play.single" | "play.list";
const mixedList = game.interactions.get(listKey).getInput("choice");
type MixedListMode = Expect<
  Equal<typeof mixedList.selectionMode, "single" | "many">
>;
// @ts-expect-error Choice-list collectors remain many in a mixed interaction union.
const listAlwaysSingle: "single" = mixedList.selectionMode;

type UnknownMode = Expect<
  Equal<InputBase<unknown, string, string>["selectionMode"], "single" | "many">
>;
void [singlePossible, manyPossible, alwaysSingle, alwaysMany, listAlwaysSingle];
