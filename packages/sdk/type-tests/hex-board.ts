import {
  compileManifest,
  createTableQueries,
  fromCoordinates,
} from "../src/reducer";
import { createHexBoardGeometry } from "../src/shared/hex-board";
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
      shape: fromCoordinates([
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ]),
      spaces: { "0,0": { id: "home", typeId: "city" } },
    },
  ],
} as const);
const q = createTableQueries(manifest.createInitialTable());
q.board("island").neighbors("home");
q.board("island").neighbors("1,0");
// @ts-expect-error Explicit coordinates exclude absent axial spaces.
q.board("island").neighbors("2,0");
// @ts-expect-error Override replaces the coordinate's default ID.
q.board("island").neighbors("0,0");
// @ts-expect-error Unknown board.
q.board("missing");
const a = createHexBoardGeometry({
  id: "a",
  spaces: [{ id: "home", q: 0, r: 0 }],
});
const b = createHexBoardGeometry({
  id: "b",
  spaces: [{ id: "home", q: 0, r: 0 }],
});
a.spacesAlong(a.edgesOf("home")[0]!);
// @ts-expect-error Edge identities belong to one board.
a.spacesAlong(b.edgesOf("home")[0]!);
// @ts-expect-error Manual strings are not canonical edge identities.
a.spacesAlong("a:edge:home:0");
// @ts-expect-error Edge identities cannot stand in for vertices.
a.spacesAt(a.edgesOf("home")[0]!);

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
      shape: fromCoordinates([{ q: 0, r: 0 }]),
    },
    {
      id: "second",
      name: "Second",
      layout: "hex",
      scope: "shared",
      shape: fromCoordinates([{ q: 0, r: 0 }]),
    },
  ],
} as const);
const publicQueries = createTableQueries(pair.createInitialTable());
const first = publicQueries.board("first");
const second = publicQueries.board("second");
first.verticesOf(first.edgeAt("0,0", 0));
first.edgesOf(first.vertexAt("0,0", 0));
// @ts-expect-error Public bound queries reject another board's edge.
first.verticesOf(second.edgeAt("0,0", 0));
// @ts-expect-error Public bound queries reject another board's vertex.
first.edgesOf(second.vertexAt("0,0", 0));

const city: (typeof manifest.literals.spaceTypeIds)[number] = "city";
q.board("island").spacesByType(city);
// @ts-expect-error Hex coordinate override type IDs are inferred.
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
        { typeId: "route", fromSpaceId: "start", toSpaceId: "finish" },
      ],
    },
  ],
} as const);
const track = createTableQueries(links.createInitialTable()).board("track");
track.relatedSpaces("start", "route");
// @ts-expect-error Bound relation kinds stay manifest scoped.
track.relatedSpaces("start", "unknown");
// @ts-expect-error Bound generic space kinds stay manifest scoped.
track.spacesByType("unknown");
