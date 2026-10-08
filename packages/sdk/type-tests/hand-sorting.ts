import type { z } from "zod";
import { createGameInstance } from "../src/headless/instance.js";
import {
  handFeature,
  type HandOptions,
  type HandController,
} from "../src/headless/features/hand.js";
import type { CommandSource } from "../src/headless/sources/types.js";
import type { HiddenCardId } from "../src/headless/model.js";

type Game = {
  contract: {
    manifest: {
      ids: {
        zoneId: z.ZodEnum<{ hand: "hand"; discard: "discard"; deck: "deck" }>;
        cardId: z.ZodLiteral<"red">;
      };
    };
  };
};
declare const source: CommandSource;
const game = createGameInstance<Game>()({
  source,
  features: (core, context) => ({
    hand: handFeature(core, context, {
      zones: {
        hand: {
          defaultSort: "suit",
          sorts: {
            suit: {
              compare: (left, right) => {
                if (left.hidden) {
                  const hidden: HiddenCardId = left.id;
                  const view: null = left.view;
                  void [hidden, view];
                } else {
                  const visible: "red" = left.id;
                  void visible;
                }
                return left.id.localeCompare(right.id);
              },
            },
            rank: { compare: () => 0 },
          },
        },
        discard: {
          defaultSort: "newest",
          sorts: { newest: { compare: () => 0 } },
        },
      },
    }),
  }),
});
const hand = game.zones.get("hand", "alice");
const discard = game.zones.get("discard", "table");
const modes: readonly ("suit" | "rank")[] = game.hand.getSortModes(hand);
const mode: "suit" | "rank" | null = game.hand.getSortMode(hand);
const discardMode: "newest" | null = game.hand.getSortMode(discard);
const ids: readonly ("red" | HiddenCardId)[] = game.hand.getSortedCardIds(hand);
game.hand.setSortMode(hand, "rank");
game.hand.setSortMode(discard, "newest");
// @ts-expect-error Mode belongs to the zone supplied in the first argument.
game.hand.setSortMode(hand, "newest");
// @ts-expect-error Mode belongs to the zone supplied in the first argument.
game.hand.setSortMode(discard, "rank");
// @ts-expect-error Unknown modes cannot widen the zone's mode union.
game.hand.setSortMode(hand, "missing");
// @ts-expect-error Unconfigured zones have no selectable sort modes.
game.hand.setSortMode(game.zones.get("deck", "table"), "rank");
// @ts-expect-error Captured mode arrays are readonly.
// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: mode arrays are readonly.
modes.push("rank");
// @ts-expect-error Captured ID arrays are readonly.
// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: ID arrays are readonly.
ids.push("red");
const bare = createGameInstance<Game>()({ source });
// @ts-expect-error Disabled hand controller is absent.
bare.hand;
createGameInstance<Game>()({
  source,
  features: (core, context) => ({
    hand: handFeature(core, context, {
      zones: {
        // @ts-expect-error Configured zones must belong to the game.
        missing: { sorts: { rank: { compare: () => 0 } } },
      },
    }),
  }),
});
createGameInstance<Game>()({
  source,
  features: (core, context) => ({
    hand: handFeature(core, context, {
      zones: {
        // @ts-expect-error Default modes must belong to this zone's declared sorts.
        hand: { defaultSort: "missing", sorts: { rank: { compare: () => 0 } } },
      },
    }),
  }),
});
void [modes, mode, discardMode, ids];

const external = {
  zones: {
    hand: {
      defaultSort: "rank",
      sorts: {
        rank: { compare: (left, right) => left.id.localeCompare(right.id) },
      },
    },
  },
} as const satisfies HandOptions<Game>;
const externallyConfigured = createGameInstance<Game>()({
  source,
  features: (core, context) => ({
    hand: handFeature(core, context, external),
  }),
});
const externalMode: "rank" | null = externallyConfigured.hand.getSortMode(hand);
const controller: HandController<Game> = game.hand;
const publicMode: string | null = controller.getSortMode(hand);
// A broad public annotation has no configured mode keys; runtime admission owns this boundary.
controller.setSortMode(hand, "missing");
void [externalMode, publicMode];

// @ts-expect-error Sorting lives on the captured hand controller.
hand.getSortedCardIds;
createGameInstance<Game>()({
  source,
  features: (core, context) => ({
    // @ts-expect-error The former single comparator option is removed.
    hand: handFeature(core, context, { sort: () => 0 }),
  }),
});
