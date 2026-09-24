import type { definition } from "./authoring-model-types.js";
import { createGameInstance } from "../src/headless/instance.js";
import type {
  CoreInstance,
  InputBase,
  InputKey,
  InteractionKey,
  InteractionParams,
} from "../src/headless/model.js";
import type { CommandSource } from "../src/headless/sources/types.js";
type Game = typeof definition;
declare const source: CommandSource;
const bind = createGameInstance<Game>();
const bare = bind({ source });
const game = bind({
  source,
  features: (core) => ({ custom: customFeature(core) }),
});
function customFeature(core: CoreInstance<Game>) {
  return {
    root: { getRolled: () => core.view?.rolled },
    input: {
      suggested<K extends InteractionKey<Game>, N extends InputKey<Game, K>>(
        this: InputBase<Game, K, N>,
      ): InteractionParams<Game, K>[N] | undefined {
        return this.getValue();
      },
    },
    interaction: {
      customLabel() {
        return "custom";
      },
    },
    card: {
      isSpecial() {
        return true;
      },
    },
  };
}
const mood = game.interactions.get("playerTurn.pick")!.getInput("mood")!;
const inferredMood: "ready" | "wait" | undefined = mood.suggested();
mood.setValue("wait");
const id: "card-1" = game.cards.get("card-1")!.id;
game.cards.get("card-1")!.isSpecial();
game.phase.switch({ setup: () => 0, playerTurn: () => 1 });
game.setOptions({
  source,
  state: {
    drafts: { "playerTurn.pick": { mood: "ready" } },
    activeInteraction: "playerTurn.pick",
  },
  onDraftsChange(drafts) {
    const value: "ready" | "wait" | undefined = drafts["playerTurn.pick"]?.mood;
    void value;
  },
});
// @ts-expect-error Missing exhaustive phase route.
game.phase.switch({ setup: () => 0 });
// @ts-expect-error Unknown phase.
game.phase.is("invalid");
// @ts-expect-error Unknown card identity.
game.cards.get("invalid");
// @ts-expect-error Unknown interaction.
game.interactions.get("playerTurn.invalid");
// @ts-expect-error Unknown input.
game.interactions.get("playerTurn.pick")!.getInput("invalid");
// @ts-expect-error Value retains literal choice union.
mood.setValue("invalid");
// @ts-expect-error Disabled root feature is absent.
bare.getRolled();
// @ts-expect-error Disabled card feature is absent.
bare.cards.get("card-1")!.isSpecial();
// @ts-expect-error Disabled input feature is absent.
bare.interactions.get("playerTurn.pick")!.getInput("mood")!.suggested();
// @ts-expect-error Hosted sources cannot apply local commands.
bare.apply({});
declare const local: CommandSource & {
  apply(action: { kind: "local" }): Promise<number>;
};
const localGame = bind({ source: local });
const localResult: Promise<number> = localGame.apply({ kind: "local" });
void [inferredMood, id, localResult];

// @ts-expect-error undefined is not a submitted value; clear() owns omission.
mood.setValue(undefined);

game.cards.get("card-1")!.getInteractions()[0]!.getInputs();
game.cards.get("card-1")!.getInteractions()[0]!.customLabel();
mood.interaction.customLabel();
game.inspect().getRolled();
// @ts-expect-error Disabled interaction feature is absent through card navigation.
bare.cards.get("card-1")!.getInteractions()[0]!.customLabel();

// @ts-expect-error Auto phases do not manufacture interaction keys.
game.interactions.get("setup.anything");
