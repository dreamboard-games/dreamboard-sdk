import { z } from "zod";
import { createGame, boardRefSchema } from "@dreamboard-games/sdk/reducer";
import {
  createGameInstance,
  type CommandSource,
  type InputBase,
} from "@dreamboard-games/sdk";
import { createGameHook } from "@dreamboard-games/sdk/react";
import { createScenarioAuthoring } from "@dreamboard-games/sdk/testing";

const author = createGame({
  manifest: {
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [],
    zones: [],
  },
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
  phases: { play: z.object({}) },
});
const definition = author.assemble({
  initialPhase: "play",
  view: author.view(() => ({})),
  phases: {
    play: author.phase("play").define({
      kind: "player",
      initialState: () => ({}),
      interactions: {
        choose: author.phase("play").interaction({
          inputs: {
            mood: author.phase("play").inputs.form.choice({
              choices: [
                { value: "ready", label: "Ready" },
                { value: "wait", label: "Wait" },
              ] as const,
              defaultValue: "ready",
            }),
          },
          reduce: () => {},
        }),
      },
    }),
  },
});
declare const source: CommandSource;
const instance = createGameInstance<typeof definition>()({ source });
const input = instance.inputs.get("play.choose", "mood");
input.setValue("ready");
// @ts-expect-error Values retain the authored literal union in the installed package.
input.setValue("invalid");
// @ts-expect-error Unknown qualified interaction names are rejected.
instance.interactions.get("play.invalid");
const hook = createGameHook<typeof definition>()({});
const mood: "ready" | "wait" | undefined = hook
  .useGame()
  .inputs.get("play.choose", "mood")
  .getValue();
void mood;
const scenarios = createScenarioAuthoring(definition);
scenarios.defineScenario({
  id: "choice",
  setup: { players: 2, seed: 0 },
  given: [],
  when: [
    { actor: { seat: 0 }, interactionId: "choose", params: { mood: "ready" } },
  ],
  then: () => {},
});
// @ts-expect-error A narrowed board ID needs a runtime schema witness.
boardRefSchema<"main">();
const board = boardRefSchema({ baseIdSchema: z.literal("main") });
const id: "main" = board.parse({ baseId: "main" }).baseId;
void id;

// @ts-expect-error Ordinary assignment must not widen a literal setter.
const erased: Pick<InputBase<unknown, string, string>, "setValue"> = input;
void erased;
const control = input.getControl();
if (control.type === "boundedNumber" && control.mode === "many") {
  control.setValue([1]);
  // @ts-expect-error A many numeric control never accepts a scalar.
  control.setValue(1);
}

// @ts-expect-error Board layout types are inferred from instances, not exported as aliases.
type PrivateBoardLayout = import("@dreamboard-games/sdk").BoardLayout;
