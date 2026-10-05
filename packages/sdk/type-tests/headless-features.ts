import { asPlayerId } from "../src/reducer/per-player.js";
import type { z } from "zod";
import type { definition } from "./authoring-model-types.js";
import { createGameInstance } from "../src/headless/instance.js";
import type { CommandSource } from "../src/headless/sources/types.js";
import type { HiddenCardId, IdOf } from "../src/headless/model.js";
import { boardFeature } from "../src/headless/features/board.js";
import { dragFeature } from "../src/headless/features/drag.js";
import { handFeature } from "../src/headless/features/hand.js";
import { panZoomFeature } from "../src/headless/features/pan-zoom.js";
import {
  originsFeature,
  type CardOrigin,
} from "../src/headless/features/origins.js";
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
    origins: originsFeature(core),
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
const board = game.boards.get("island");
const boardId: "island" = board.id;
board.getLabel();
board.getLayout({ hexSize: 12, viewport: game.viewport.getTransform() });
board.game.boards.get("island").getLabel();
const card = game.zones.get("hand", asPlayerId("player-1")).getCards()[0];
game.drag.begin(card.id, { interaction: "playerTurn.pick" });
card.getBadge();
const origin = card.getOrigin();
if (origin && "zone" in origin) {
  const zone: IdOf<Game, "zoneId"> = origin.zone;
  const hidden: boolean = origin.hidden;
} else if (origin) {
  const player: IdOf<Game, "playerId"> = origin.player;
}
// @ts-expect-error Origins name the game's own zones.
const unknownZone: CardOrigin<Game> = { zone: "nowhere", hidden: false };
// @ts-expect-error Disabled origin API is absent.
bare.zones.get("hand", asPlayerId("player-1")).getCards()[0].getOrigin;
const selected: readonly ("card-1" | "card-2" | HiddenCardId)[] = game.zones
  .get("hand", asPlayerId("player-1"))
  .getSelectedCardIds();
game.getSnapshot().viewport.getTransform();
game.getSnapshot().drag.getDropTargets();
// @ts-expect-error Disabled root APIs are absent.
bare.boards;
// @ts-expect-error Disabled drag API is absent.
bare.drag;
// @ts-expect-error Drag card identities remain model-bound.
game.drag.begin("missing");
// @ts-expect-error Disabled per-zone APIs are absent.
// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: Disabled per-zone APIs are absent.
bare.zones.get("hand", asPlayerId("player-1")).getSelectedCardIds();
// @ts-expect-error Board identities remain model-bound.
game.boards.get("unknown");
// @ts-expect-error Drag interaction identities remain model-bound.
game.drag.begin(card.id, { interaction: "playerTurn.unknown" });
void [boardId, selected];

const layout = board.getLayout({ hexSize: 12 });
// @ts-expect-error Captured layout arrays are readonly.
// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: Captured layout arrays are readonly.
layout.getSpaces().push(layout.getSpaces()[0]);
// @ts-expect-error Captured element properties are readonly.
layout.getSpaces()[0].center = { x: 0, y: 0 };
// @ts-expect-error Captured point coordinates are readonly.
layout.getEdges()[0].line[0].x = 1;
// @ts-expect-error Captured viewBox is readonly.
layout.viewBox.width = 1;

// React hooks keep the same game-specific IDs and correlated input options.
import { createGameHook } from "../src/react.js";
const hooks = createGameHook<Game>()({
  features: (core, context) => ({ drag: dragFeature(core, context) }),
});
function useTypedDragProof() {
  hooks.useCardGesture("card-1", {
    drag: { interaction: "playerTurn.pick", input: "cardId" },
  });
  hooks.useCardGesture("card-1", { drag: false });
  // @ts-expect-error Drag support must be explicit.
  hooks.useCardGesture("card-1");
  // @ts-expect-error Unknown card identity.
  hooks.useCardGesture("missing", { drag: {} });
  // @ts-expect-error Unknown interaction identity.
  hooks.useCardGesture("card-1", { drag: { interaction: "unknown" } });
  // @ts-expect-error The previous implicit-drag contract is removed.
  hooks.useCardGesture("card-1", { interaction: "playerTurn.pick" });
  hooks.useCardGesture("card-1", {
    drag: {
      interaction: "playerTurn.pick",
      // @ts-expect-error Input belongs to the selected interaction.
      input: "missing",
    },
  });
  hooks.useDropArea(null);
  hooks.useDropArea({ interaction: "playerTurn.pick" });
  // @ts-expect-error An area names the interaction it runs.
  hooks.useDropArea({});
  // @ts-expect-error Unknown interaction identity.
  hooks.useDropArea({ interaction: "unknown" });
  const target = game.drag.getDropTargets()[0];
  hooks.useDropArea(target);
  if (target.kind === "interaction") {
    const input: "cardId" = target.cardInputKey;
    void input;
  }
  const overlay = hooks.useDragOverlay();
  if (overlay) {
    // @ts-expect-error The overlay names a model-bound card.
    const id: "missing" = overlay.cardId;
    void id;
  }
}
void useTypedDragProof;
