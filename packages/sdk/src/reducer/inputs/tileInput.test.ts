import { describe, expect, test } from "vitest";
import * as z from "zod";
import { createGame } from "../authoring/game";
import { createTableQueries } from "../table-queries";
import {
  schemaForCollectors,
  schemaForAuthorCollectors,
  createAuthorParamSchemasByPhase,
  createClientParamSchemasByPhase,
} from "../client-param-schemas";
import { collectInteractionInputs } from "../bundle/trusted/collector-domains";
import {
  collectTileInputKeys,
  collectTileZoneIds,
} from "../bundle/trusted/collector-introspection";
import { enumerateCollectorInputAssignments } from "../bundle/trusted/collector-input-solver";
import { SeatTileRefSchema } from "../../shared/domain/seat-reference.js";
import { InputDomainSchema } from "../../shared/interaction-schema.js";
import { tileSpaceId } from "../../shared/domain/tile-space.js";
import { boardInput } from "./boardInput";
import { boardTarget } from "./boardTarget";
import { many } from "./many";

const source = {
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [],
  zones: [{ id: "bag", name: "Bag", scope: "shared", visibility: "public" }],
  boards: [{ id: "map", name: "Map", layout: "square", scope: "shared" }],
  tileTypes: [
    {
      id: "terrain",
      name: "Terrain",
      layout: "square",
      cells: [{ id: "center", at: { col: 0, row: 0 } }],
    },
  ],
  tileSeeds: [
    {
      id: "bag-tile",
      typeId: "terrain",
      home: { type: "zone", zoneId: "bag" },
    },
    {
      id: "placed",
      typeId: "terrain",
      home: {
        type: "board",
        boardId: "map",
        layout: "square",
        col: 0,
        row: 0,
        rotation: 0,
      },
    },
    { id: "detached", typeId: "terrain" },
  ],
} as const;
function fixture() {
  const game = createGame({
    manifest: source,
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: { play: z.object({}) },
    errors: { NOT_PLACED: "Not placed" },
  });
  const phase = game.phase("play");
  const table = game.contract.manifest.createInitialTable({
    playerIds: ["seat"],
  });
  const state = { table, flow: { currentPhase: "play" } };
  const q = createTableQueries(table, game.contract.manifest);
  return { game, phase, state, q };
}
const ref = SeatTileRefSchema.parse(`tile-ref:sha256:${"a".repeat(64)}`);

describe("tile inventory collectors", () => {
  test("targets real inventory in zones and on exact boards, with typed query predicates", () => {
    const { game, phase, state, q } = fixture();
    const bag = phase.inputs.tile({ from: ["bag"] });
    const board = phase.inputs.tile({
      boards: ["map"],
      where: {
        id: "placed",
        errorCode: "NOT_PLACED",
        test: ({ targetId, q }) => q.tile(targetId).tileTypeId === "terrain",
      },
    });
    expect(bag.eligibleTargets?.(state, "seat", q)).toEqual(["bag-tile"]);
    expect(board.eligibleTargets?.(state, "seat", q)).toEqual(["placed"]);
    expect(board.schema).toBe(game.contract.manifest.ids.tileId);
    expect(
      board.validateTarget?.(state, "seat", q, tileSpaceId("placed", "center")),
    ).toMatchObject({ errorCode: "TILE_TARGET_NOT_ELIGIBLE" });
    expect(board.validateTarget?.(state, "seat", q, "detached")).toMatchObject({
      errorCode: "TILE_TARGET_NOT_ELIGIBLE",
    });
    expect(boardTarget).not.toHaveProperty("tile");
    expect(boardInput).not.toHaveProperty("tile");
  });

  test("enumerates authoritative tile domains and declared reference keys", () => {
    const { game, phase, state, q } = fixture();
    const interaction = phase.interaction({
      inputs: { selected: phase.inputs.tile({ from: ["bag"] }) },
      reduce: () => {},
    });
    expect([...collectTileInputKeys(interaction)]).toEqual(["selected"]);
    expect(collectTileZoneIds(interaction)).toEqual(["bag"]);
    expect(
      collectInteractionInputs(interaction, state, "seat", {
        definitions: game.contract.manifest,
        queries: q,
      }),
    ).toEqual([
      {
        key: "selected",
        kind: "tile",
        domain: {
          type: "tileTarget",
          projection: "resolved",
          targetKind: "tile",
          zoneIds: ["bag"],
          boardIds: [],
          eligibleTargets: ["bag-tile"],
        },
      },
    ]);
    expect(
      enumerateCollectorInputAssignments({
        interaction,
        domainState: state,
        playerId: "seat",
        definitions: game.contract.manifest,
        queries: q,
        maxEvaluations: 20,
      }),
    ).toMatchObject({
      status: "enumerated",
      assignments: [{ selected: "bag-tile" }],
    });
    expect(
      InputDomainSchema.safeParse({
        type: "tileTarget",
        projection: "resolved",
        targetKind: "tile",
        zoneIds: ["bag"],
        boardIds: [],
        eligibleTargets: ["bag-tile"],
      }).success,
    ).toBe(false);
    expect(
      InputDomainSchema.safeParse({
        type: "tileTarget",
        projection: "resolved",
        targetKind: "tile",
        zoneIds: ["bag"],
        boardIds: [],
        eligibleTargets: [ref],
      }).success,
    ).toBe(true);
  });

  test("client schemas accept seat references, enforce many, and never inject authoritative defaults", () => {
    const { phase } = fixture();
    const tile = phase.inputs.tile({ from: ["bag"] });
    const schema = schemaForCollectors({
      selected: { ...tile, defaultValue: "bag-tile" },
      multiple: many(tile, { count: 2, distinct: true }),
    });
    const author = schemaForAuthorCollectors({
      selected: { ...tile, defaultValue: "bag-tile" },
      multiple: many(tile, { count: 2, distinct: true }),
    });
    expect(
      author.safeParse({ multiple: ["bag-tile", "placed"] }),
    ).toMatchObject({
      success: true,
      data: { selected: "bag-tile", multiple: ["bag-tile", "placed"] },
    });
    expect(
      author.safeParse({ selected: ref, multiple: ["bag-tile", "placed"] })
        .success,
    ).toBe(false);
    const other = SeatTileRefSchema.parse(`tile-ref:sha256:${"b".repeat(64)}`);
    expect(
      schema.safeParse({ selected: ref, multiple: [ref, other] }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ selected: "bag-tile", multiple: [ref, other] })
        .success,
    ).toBe(false);
    expect(schema.safeParse({ multiple: [ref, other] }).success).toBe(false);
    expect(
      schema.safeParse({ selected: ref, multiple: [ref, ref] }).success,
    ).toBe(false);
    expect(schema.safeParse({ selected: ref, multiple: [ref] }).success).toBe(
      false,
    );
  });

  test("custom params schemas replace only declared ref positions and reject opaque overrides", () => {
    const { game, phase } = fixture();
    const inputs = { selected: phase.inputs.tile({ from: ["bag"] }) };
    const definition = (
      paramsSchema: z.ZodType<{
        selected: "bag-tile" | "placed" | "detached";
        label?: string;
      }>,
    ) =>
      game.assemble({
        phases: {
          play: phase.define({
            kind: "player",
            initialState: () => ({}),
            interactions: {
              choose: phase.interaction({
                inputs,
                paramsSchema,
                reduce: () => {},
              }),
            },
          }),
        },
        view: () => ({}),
      });
    const schema = z.object({
      selected: game.contract.manifest.ids.tileId,
      label: z.string().optional(),
    });
    const client = createClientParamSchemasByPhase(definition(schema)).play
      .choose;
    expect(
      client.safeParse({ selected: ref, label: "bag-tile" }),
    ).toMatchObject({
      success: true,
      data: { selected: ref, label: "bag-tile" },
    });
    expect(client.safeParse({ selected: "bag-tile" }).success).toBe(false);
    const author = createAuthorParamSchemasByPhase(definition(schema)).play
      .choose;
    expect(author.safeParse({ selected: "bag-tile" }).success).toBe(true);
    expect(author.safeParse({ selected: ref }).success).toBe(false);
    expect(() =>
      createClientParamSchemasByPhase(definition(schema.refine(() => true))),
    ).toThrow("unrefined object");
    expect(() =>
      createClientParamSchemasByPhase(
        definition(schema.transform((value) => value)),
      ),
    ).toThrow("unrefined object");
  });
});
