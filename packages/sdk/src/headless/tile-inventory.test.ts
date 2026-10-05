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
