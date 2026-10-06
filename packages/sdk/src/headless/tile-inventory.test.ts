import { describe, expect, it } from "vitest";
import { createGameInstance, AmbiguousTargetError } from "./instance.js";
import { frame, session } from "./sources/__fixtures__/frames.js";
import { createTestSource } from "../testing/sources/test-source.js";
import { SeatTileRefSchema } from "../shared/domain/seat-reference.js";
import type { InteractionDescriptor } from "../shared/protocol/frame.js";
const ref = SeatTileRefSchema.parse(`tile-ref:sha256:${"a".repeat(64)}`);
const hidden = {
  disclosure: "concealed" as const,
  ref,
  appearance: { layout: "square" as const, cells: [{ col: 0, row: 0 }] },
};
const descriptor = (key = "play.pick"): InteractionDescriptor => ({
  kind: "action",
  phaseName: "play",
  interactionKey: key,
  interactionId: key.split(".")[1],
  label: "Pick",
  commit: { mode: "manual" },
  availability: { status: "available" },
  inputs: [
    {
      key: "tile",
      kind: "tile",
      domain: {
        type: "tileTarget",
        projection: "resolved",
        targetKind: "tile",
        zoneIds: ["bag"],
        boardIds: [],
        eligibleTargets: [ref],
      },
    },
  ],
});
function setup(descriptors = [descriptor()]) {
  const { basis: _basis, ...base } = frame();
  void _basis;
  const source = createTestSource({
    me: "alice",
    players: session.players,
    version: 1,
    frame: {
      ...base,
      availableInteractions: descriptors,
      zones: {
        bag: {
          table: {
            cardIds: [],
            cardViewsById: {},
            cardBacksById: {},
            playableByCardId: {},
            tiles: [hidden],
          },
        },
      },
    },
  });
  const game = createGameInstance<unknown>()({ source });
  return {
    source,
    game,
    tile: () => game.zones.get("bag", "table").getTile(ref),
  };
}
describe("projected tile inventory", () => {
  it("renders admitted backs and routes tile input selection without creating board controls", () => {
    const { game, tile, source } = setup();
    const zone = game.zones.get("bag", "table");
    expect(zone.count).toBe(1);
    expect(zone.getIsEmpty()).toBe(false);
    expect(zone.getCards()).toEqual([]);
    expect(zone.getTiles()).toHaveLength(1);
    expect(tile().data).toEqual(hidden);
    expect(
      tile()
        .getInteractions()
        .map((route) => route.key),
    ).toEqual(["play.pick"]);
    tile().getTargetProps().onClick();
    expect(tile().getIsSelected()).toBe(true);
    expect(game.inputs.get("play.pick", "tile").getValue()).toBe(ref);
    expect(source.submissions).toEqual([]);
    expect(
      zone.findTile(
        SeatTileRefSchema.parse(`tile-ref:sha256:${"b".repeat(64)}`),
      ),
    ).toBeUndefined();
    game.dispose();
  });
  it("exposes generic tile target controls with public labels and selection", () => {
    const { game, source } = setup();
    const input = game.inputs.get("play.pick", "tile");
    expect(input.getEligibleTargets()).toEqual([ref]);
    expect(input.getTargetOptions().map((option) => option.label)).toEqual([
      "Tile back 1",
    ]);
    const control = input.getControl();
    if (control.type !== "targets") throw new Error("Expected target editor");
    expect(control.options).toHaveLength(1);
    control.options[0].props.onClick();
    expect(
      game.inputs.get("play.pick", "tile").getTargetOptions()[0].selected,
    ).toBe(true);
    const current = source.store.get().snapshot!;
    source.emit({
      ...current,
      version: 2,
      frame: {
        ...current.frame,
        zones: {
          bag: {
            table: {
              cardIds: [],
              cardViewsById: {},
              cardBacksById: {},
              playableByCardId: {},
              tiles: [
                {
                  disclosure: "visible",
                  ref,
                  tileTypeId: "forest",
                  name: "Forest",
                  ownerId: null,
                  fields: {},
                  properties: {},
                },
              ],
            },
          },
        },
      },
    });
    expect(
      game.inputs.get("play.pick", "tile").getTargetOptions()[0].label,
    ).toBe("Forest");
    expect(input.getTargetOptions()[0].label).toBe("Tile back 1");
    game.inputs.get("play.pick", "tile").clear();
    control.options[0].props.onClick();
    expect(game.inputs.get("play.pick", "tile").getValue()).toBeUndefined();
    game.dispose();
  });
  it("labels card and board domains from admitted metadata without reference heuristics", () => {
    const card: InteractionDescriptor = {
      ...descriptor(),
      inputs: [
        {
          key: "card",
          kind: "card",
          domain: {
            type: "cardTarget",
            projection: "resolved",
            targetKind: "card",
            zoneIds: ["bag"],
            eligibleTargets: ["visible-card", "hidden-card"],
          },
        },
      ],
    };
    const board: InteractionDescriptor = {
      ...descriptor("play.board"),
      inputs: [
        {
          key: "space",
          kind: "board-space",
          domain: {
            type: "boardTarget",
            projection: "resolved",
            targetKind: "space",
            valueKind: "board-id",
            boardId: "track",
            eligibleTargets: ["named", "unnamed"],
          },
        },
      ],
    };
    const { source, game } = setup([card, board]);
    const current = source.store.get().snapshot!;
    source.emit({
      ...current,
      version: 2,
      frame: {
        ...current.frame,
        zones: {
          bag: {
            table: {
              tiles: [],
              cardIds: ["visible-card", "hidden-card"],
              cardViewsById: {
                "visible-card": {
                  id: "visible-card",
                  cardType: "face",
                  properties: {},
                  name: "Ace",
                },
              },
              cardBacksById: {},
              playableByCardId: {},
            },
          },
        },
        view: {
          boards: {
            track: {
              id: "track",
              baseId: "track",
              scope: "shared",
              layout: "generic",
              name: "Track",
              fields: {},
              spaces: {
                named: { id: "named", name: "Harbor", fields: {} },
                unnamed: { id: "unnamed", fields: {} },
              },
              relations: [],
            },
          },
        },
      },
    });
    expect(
      game.inputs
        .get("play.pick", "card")
        .getTargetOptions()
        .map((option) => option.label),
    ).toEqual(["Ace", "Card back 2"]);
    expect(
      game.inputs
        .get("play.board", "space")
        .getTargetOptions()
        .map((option) => option.label),
    ).toEqual(["Harbor", "Space 2"]);
    game.dispose();
  });
  it("counts projected cards and tiles and never fills omitted inventory gaps", () => {
    const { game, source } = setup();
    const current = source.store.get().snapshot!;
    source.emit({
      ...current,
      version: 2,
      frame: {
        ...current.frame,
        zones: {
          bag: {
            table: {
              cardIds: ["card"],
              cardViewsById: {},
              cardBacksById: {},
              playableByCardId: {},
              tiles: [hidden],
            },
          },
        },
      },
    });
    const zone = game.zones.get("bag", "table");
    expect(zone.count).toBe(2);
    expect(zone.getCards()).toHaveLength(1);
    expect(zone.getTiles()).toHaveLength(1);
    source.emit({
      ...source.store.get().snapshot!,
      version: 3,
      frame: {
        ...current.frame,
        zones: {
          bag: {
            table: {
              cardIds: [],
              cardViewsById: {},
              cardBacksById: {},
              playableByCardId: {},
              tiles: [],
            },
          },
        },
      },
    });
    expect(game.zones.get("bag", "table").count).toBe(0);
    expect(game.zones.get("bag", "table").getIsEmpty()).toBe(true);
    game.dispose();
  });
  it("requires a route when two tile inputs accept the same presentation", () => {
    const { game, tile } = setup([descriptor(), descriptor("play.other")]);
    expect(() => tile().select()).toThrow(AmbiguousTargetError);
    tile().select({ interaction: "play.other", input: "tile" });
    expect(game.inputs.get("play.other", "tile").getValue()).toBe(ref);
    game.dispose();
  });
  it.each(["version", "restore", "seat", "source"])(
    "expires captured tile handlers after %s replacement",
    (change) => {
      const { game, source, tile } = setup();
      const stale = tile().getSelectHandler();
      const snapshot = source.store.get().snapshot!;
      if (change === "source") {
        const replacement = setup();
        game.setOptions({ source: replacement.source });
        replacement.game.dispose();
      } else
        source.emit({
          ...snapshot,
          version: change === "version" ? 2 : 1,
          me: change === "seat" ? "bob" : "alice",
        });
      stale();
      expect(game.inputs.get("play.pick", "tile").getValue()).toBeUndefined();
      expect(source.submissions).toEqual([]);
      game.dispose();
    },
  );
});
