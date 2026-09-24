import type { z } from "zod";
import type { definition } from "./authoring-model-types.js";
import { createGameInstance } from "../src/headless/instance.js";
import type { CommandSource } from "../src/headless/sources/types.js";
import { boardFeature } from "../src/headless/features/board.js";
import { dragFeature } from "../src/headless/features/drag.js";
import { handFeature } from "../src/headless/features/hand.js";
import { panZoomFeature } from "../src/headless/features/pan-zoom.js";
// Extend the checked authoring fixture with one board identity for composition proof.
type Definition = typeof definition;
type Game = Omit<Definition, "contract"> & {
  contract: Omit<Definition["contract"], "manifest"> & {
    manifest: Omit<Definition["contract"]["manifest"], "ids"> & {
      ids: Omit<Definition["contract"]["manifest"]["ids"], "boardId"> & {
        boardId: z.ZodLiteral<"island">;
      };
    };
  };
};
declare const source: CommandSource;
const bare = createGameInstance<Game>()({ source });
const game = createGameInstance<Game>()({
  source,
  features: (core, context) => ({
    board: boardFeature(core, context),
    hand: handFeature(core),
    drag: dragFeature(core, context),
    viewport: panZoomFeature(core, context),
    custom: {
      board: {
        getLabel() {
          return "Board";
        },
      },
      card: {
        getBadge() {
          return "Card";
        },
      },
    },
  }),
});
const board = game.boards.get("island")!;
const boardId: "island" = board.id;
board.getLabel();
board.getLayout({ hexSize: 12, viewport: game.viewport.getTransform() });
board.game.boards.get("island")!.getLabel();
const card = game.zones.get("hand")!.getCards()[0]!;
card.getDragProps({ interaction: "playerTurn.pick" });
card.getBadge();
const selected: readonly ("card-1" | "card-2")[] = game.zones
  .get("hand")!
  .getSelectedCardIds();
game.getSnapshot().viewport.getTransform();
game.getSnapshot().drag.getDropTargets();
// @ts-expect-error Disabled root APIs are absent.
bare.boards;
// @ts-expect-error Disabled drag API is absent.
bare.drag;
// @ts-expect-error Disabled per-card APIs are absent.
bare.cards.get("card-1")!.getDragProps();
// @ts-expect-error Disabled per-zone APIs are absent.
bare.zones.get("hand")!.getSelectedCardIds();
// @ts-expect-error Board identities remain model-bound.
game.boards.get("unknown");
// @ts-expect-error Drag interaction identities remain model-bound.
card.getDragProps({ interaction: "playerTurn.unknown" });
void [boardId, selected];

const layout = board.getLayout({ hexSize: 12 });
// @ts-expect-error Captured layout arrays are readonly.
layout.getSpaces().push(layout.getSpaces()[0]!);
// @ts-expect-error Captured element properties are readonly.
layout.getSpaces()[0]!.center = { x: 0, y: 0 };
// @ts-expect-error Captured point coordinates are readonly.
layout.getEdges()[0]!.line[0].x = 1;
// @ts-expect-error Captured viewBox is readonly.
layout.viewBox.width = 1;
