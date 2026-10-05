import {
  compileManifest,
  createTableQueries,
  tileSpaceId,
} from "../src/reducer";
import { createHexTopology } from "../src/shared/hex-board";
const manifest = compileManifest({
  players: { minPlayers: 1, maxPlayers: 1 },
  cardSets: [],
  zones: [],
  boards: [
    {
      id: "island",
      name: "Island",
      scope: "shared",
      layout: "hex",
    },
  ],
  tileTypes: [
    {
      id: "land",
      name: "Land",
      layout: "hex",
      cells: [
        { id: "home", at: { q: 0, r: 0 }, typeId: "city" },
        { id: "neighbor", at: { q: 1, r: 0 } },
      ],
    },
  ],
  tileSeeds: [
    {
      id: "land",
      typeId: "land",
      home: {
        type: "board",
        boardId: "island",
        layout: "hex",
        q: 0,
        r: 0,
        rotation: 0,
      },
    },
  ],
} as const);
const q = createTableQueries(
  manifest.createInitialTable({ playerIds: [] }),
  manifest,
);
q.board("island").neighbors(tileSpaceId("land", "home"));
q.board("island").neighbors(tileSpaceId("land", "neighbor"));
// @ts-expect-error Declared tile cells exclude absent local IDs.
q.board("island").neighbors(tileSpaceId("land", "missing"));
// @ts-expect-error Raw local names are not stable tile-space identities.
q.board("island").neighbors("0,0");
// @ts-expect-error Unknown board.
q.board("missing");
const a = createHexTopology({
  id: "a",
  spaces: [{ id: "home", q: 0, r: 0 }],
});
const b = createHexTopology({
  id: "b",
  spaces: [{ id: "home", q: 0, r: 0 }],
});
a.spacesAlong(a.edgesOf("home")[0]);
// @ts-expect-error Edge identities belong to one board.
a.spacesAlong(b.edgesOf("home")[0]);
// @ts-expect-error Manual strings are not canonical edge identities.
a.spacesAlong("a:edge:home:0");
// @ts-expect-error Edge identities cannot stand in for vertices.
a.spacesAt(a.edgesOf("home")[0]);

const pair = compileManifest({
  players: { minPlayers: 1, maxPlayers: 1 },
  cardSets: [],
  zones: [],
  boards: [
    {
      id: "first",
      name: "First",
      layout: "hex",
      scope: "shared",
    },
    {
      id: "second",
      name: "Second",
      layout: "hex",
      scope: "shared",
    },
  ],
  tileTypes: [
    {
      id: "single",
      name: "Single",
      layout: "hex",
      cells: [{ id: "center", at: { q: 0, r: 0 } }],
    },
  ],
  tileSeeds: [
    {
      id: "first-land",
      typeId: "single",
      home: {
        type: "board",
        boardId: "first",
        layout: "hex",
        q: 0,
        r: 0,
        rotation: 0,
      },
    },
    {
      id: "second-land",
      typeId: "single",
      home: {
        type: "board",
        boardId: "second",
        layout: "hex",
        q: 0,
        r: 0,
        rotation: 0,
      },
    },
  ],
} as const);
const publicQueries = createTableQueries(
  pair.createInitialTable({ playerIds: [] }),
  pair,
);
const first = publicQueries.board("first");
const second = publicQueries.board("second");
first.verticesOf(first.edgeAt(tileSpaceId("first-land", "center"), 0));
first.edgesOf(first.vertexAt(tileSpaceId("first-land", "center"), 0));
// @ts-expect-error Public bound queries reject another board's edge.
first.verticesOf(second.edgeAt(tileSpaceId("second-land", "center"), 0));
// @ts-expect-error Public bound queries reject another board's vertex.
first.edgesOf(second.vertexAt(tileSpaceId("second-land", "center"), 0));

const city: (typeof manifest.literals.spaceTypeIds)[number] = "city";
q.board("island").spacesByType(city);
// @ts-expect-error Tile cell type IDs are inferred.
q.board("island").spacesByType("unknown");
const links = compileManifest({
  players: { minPlayers: 1, maxPlayers: 1 },
  cardSets: [],
  zones: [],
  boards: [
    {
      id: "track",
      name: "Track",
      layout: "generic",
      scope: "shared",
      spaces: [{ id: "start", typeId: "entry" }, { id: "finish" }],
      relations: [
        {
          id: "route",
          typeId: "route",
          fromSpaceId: "start",
          toSpaceId: "finish",
        },
      ],
    },
  ],
} as const);
const track = createTableQueries(
  links.createInitialTable({ playerIds: [] }),
  links,
).board("track");
track.relatedSpaces("start", "route");
// Runtime relation tags are game-defined, independently of initial relations.
track.relatedSpaces("start", "new-route");
// @ts-expect-error Relation endpoints retain board membership.
track.relatedSpaces("missing", "route");
// @ts-expect-error Bound generic space kinds stay manifest scoped.
track.spacesByType("unknown");

q.board("island").gridDistance(
  tileSpaceId("land", "home"),
  tileSpaceId("land", "neighbor"),
);
q.board("island").gridDistance(
  tileSpaceId("land", "home"),
  // @ts-expect-error gridDistance preserves the board's space vocabulary.
  tileSpaceId("land", "missing"),
);

// @ts-expect-error Cached topology collections are immutable.
a.edges[0] = a.edges[1];
// @ts-expect-error Cached incidence is immutable.
a.edges[0].spaceIds[0] = "home";
// @ts-expect-error Cached layout polygons are immutable.
a.getLayout({ hexSize: 20 }).spaces[0].corners[0] = { x: 0, y: 0 };

// A scenario snapshot is a valid query input without cloning or mutable casts.
const observed: import("../src/shared/board-topology-schema").ReadonlyTopology<
  ReturnType<typeof manifest.createInitialTable>
> = manifest.createInitialTable({ playerIds: [] });
const observedQueries = createTableQueries(observed, manifest);
const observedOrder: readonly string[] = observedQueries.player.order();
void observedOrder;

observedQueries.board("island").spacesByType("city");
// @ts-expect-error Read-only queries retain exact declaration metadata.
observedQueries.board("island").spacesByType("unknown");
