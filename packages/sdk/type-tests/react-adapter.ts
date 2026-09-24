import { createElement } from "react";
import { createGameHook } from "../src/react.js";
import type { definition } from "./authoring-model-types.js";
import type { CommandSource } from "../src/headless/sources/types.js";
import type {
  CoreInstance,
  InputBase,
  InputKey,
  InteractionKey,
  InteractionParams,
} from "../src/headless/model.js";

type Game = typeof definition;
declare const source: CommandSource;
declare const local: CommandSource & {
  apply(command: { kind: "local" }): Promise<number>;
};
function feature(core: CoreInstance<Game>) {
  return {
    root: { rolled: () => core.view?.rolled },
    input: {
      suggested<K extends InteractionKey<Game>, N extends InputKey<Game, K>>(
        this: InputBase<Game, K, N>,
      ): InteractionParams<Game, K>[N] | undefined {
        return this.getValue();
      },
    },
  };
}
const { GameProvider, useGame, Subscribe } = createGameHook<Game>()({
  source,
  features: (core) => ({ custom: feature(core) }),
});
const bare = createGameHook<Game>()({ source });
const localHook = createGameHook<Game>()({ source: local });
function TypeProof() {
  const game = useGame();
  const value: "ready" | "wait" | undefined = game.inputs
    .get("playerTurn.pick", "mood")!
    .suggested();
  game.rolled();
  const selected: "ready" | "wait" | undefined = useGame((snapshot) =>
    snapshot.inputs.get("playerTurn.pick", "mood")!.getValue(),
  );
  useGame((snapshot) => snapshot.rolled());
  const result: Promise<number> = localHook.useGame().apply({ kind: "local" });
  // @ts-expect-error Hosted source has no local apply capability.
  game.apply({ kind: "local" });
  // @ts-expect-error Feature is absent when not enabled.
  bare.useGame().rolled();
  // @ts-expect-error Misspelled interaction is not admitted.
  game.interactions.get("playerTurn.pik");
  // @ts-expect-error Automatic phase has no interaction key.
  game.interactions.get("setup.fake");
  // @ts-expect-error Input value retains the authored literal choices.
  game.inputs.get("playerTurn.pick", "mood")!.setValue("invalid");
  void [value, selected, result];
  return createElement(GameProvider, {
    source,
    state: { drafts: { "playerTurn.pick": { mood: "ready" } } },
    onDraftsChange(drafts) {
      const mood: "ready" | "wait" | undefined =
        drafts["playerTurn.pick"]?.mood;
      void mood;
    },
    children: createElement(Subscribe<string | undefined>, {
      selector: (snapshot) => snapshot.me?.id,
      children: (id) => id,
    }),
  });
}
// @ts-expect-error A local-capability provider cannot replace its source with a hosted-only source.
createElement(localHook.GameProvider, { source });
createElement(GameProvider, {
  // @ts-expect-error Controlled values preserve authored choices.
  state: { drafts: { "playerTurn.pick": { mood: "invalid" } } },
});
void TypeProof;
