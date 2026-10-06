import type { TableQueries } from "../model";
import type { ZoneScopeOfTable } from "../model/extract";
import type { TransactionMutations } from "../transaction-mutations";
import { compileManifest } from "./compiler";
import {
  boardSpaceHostId,
  type BoardSpaceHostId,
} from "../../shared/domain/board-space-host.js";
import {
  perPlayerInstanceId,
  type PerPlayerInstanceId,
} from "../../shared/domain/per-player-instance.js";

const manifest = {
  players: { minPlayers: 1, maxPlayers: 4 },
  cardSets: [],
  boards: [
    {
      id: "map",
      name: "Map",
      scope: "perPlayer",
      layout: "generic",
      spaces: [{ id: "port" }],
    },
  ],
  pieceTypes: [{ id: "ship", name: "Ship" }],
  dieTypes: [{ id: "cargo-die", name: "Cargo die" }],
  pieceSeeds: [{ id: "ship", typeId: "ship", count: 2, scope: "perPlayer" }],
  dieSeeds: [{ id: "cargo-die", typeId: "cargo-die" }],
  zones: [
    { id: "board", name: "Board", attachedTo: { board: "map" } },
    { id: "space", name: "Space", attachedTo: { board: "map", space: "port" } },
    { id: "cargo", name: "Cargo", attachedTo: { pieceType: "ship" } },
    { id: "dice", name: "Dice", attachedTo: { dieType: "cargo-die" } },
  ],
} as const;
const table = compileManifest(manifest).createInitialTable({
  playerIds: ["seat"],
});
const board: Extract<keyof typeof table.zones.board, string> =
  perPlayerInstanceId("board", "map", "seat");
const space: Extract<keyof typeof table.zones.space, string> = boardSpaceHostId(
  board,
  "port",
);
const ship: Extract<keyof typeof table.zones.cargo, string> =
  perPlayerInstanceId("piece", "ship-2", "seat");
const die: Extract<keyof typeof table.zones.dice, string> = "cargo-die";
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
const exactBoard: Equal<
  Extract<keyof typeof table.zones.board, string>,
  PerPlayerInstanceId<"board", "map">
> = true;
const exactSpace: Equal<
  Extract<keyof typeof table.zones.space, string>,
  BoardSpaceHostId<PerPlayerInstanceId<"board", "map">, "port">
> = true;
const exactShip: Equal<
  Extract<keyof typeof table.zones.cargo, string>,
  PerPlayerInstanceId<"piece", "ship-1" | "ship-2">
> = true;
// @ts-expect-error A space host is not a board host.
const wrongBoard: Extract<keyof typeof table.zones.board, string> = space;
// @ts-expect-error Another piece base is not a ship host.
const wrongShip: Extract<keyof typeof table.zones.cargo, string> =
  perPlayerInstanceId("piece", "crate", "seat");
// @ts-expect-error The attached space is exact.
const wrongSpace: Extract<keyof typeof table.zones.space, string> =
  boardSpaceHostId(board, "missing");
void [
  ship,
  die,
  exactBoard,
  exactSpace,
  exactShip,
  wrongBoard,
  wrongShip,
  wrongSpace,
];

const hosted = compileManifest({
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [],
  boards: [
    { id: "table", name: "Table board", scope: "shared", layout: "generic" },
  ],
  zones: [
    { id: "attached", name: "Attached", attachedTo: { board: "table" } },
    { id: "shared", name: "Shared", scope: "shared" },
    { id: "hand", name: "Hand", scope: "perPlayer" },
  ],
} as const);
const exactAttachedScope: Equal<
  ZoneScopeOfTable<ReturnType<typeof hosted.createInitialTable>, "attached">,
  "attached"
> = true;
declare const queries: TableQueries<
  ReturnType<typeof hosted.createInitialTable>
>;
queries.zone("shared");
queries.zone("attached", "table");
// @ts-expect-error A board named table still needs an explicit attached host.
queries.zone("attached");
void exactAttachedScope;

const missingHost = {
  ...manifest,
  pieceSeeds: [
    ...manifest.pieceSeeds,
    {
      id: "crate",
      typeId: "ship",
      scope: "perPlayer",
      home: { type: "zone", zoneId: "cargo" },
    },
  ],
} as const;
// @ts-expect-error Component attachments require an explicit expanded host base.
compileManifest(missingHost);
const wrongExpandedHost = {
  ...manifest,
  pieceSeeds: [
    ...manifest.pieceSeeds,
    {
      id: "crate",
      typeId: "ship",
      scope: "perPlayer",
      home: { type: "zone", zoneId: "cargo", component: "ship" },
    },
  ],
} as const;
// @ts-expect-error Count-two ship hosts are ship-1 and ship-2, not the unexpanded base.
compileManifest(wrongExpandedHost);
const legacySlots = {
  ...manifest,
  pieceTypes: [{ id: "ship", name: "Ship", slots: [] }],
} as const;
// @ts-expect-error Removed slots reject even through inferred variables.
compileManifest(legacySlots);
const legacyContainers = {
  ...manifest,
  boards: [{ ...manifest.boards[0], containers: [] }],
} as const;
// @ts-expect-error Removed containers reject even through inferred variables.
compileManifest(legacyContainers);

declare const tx: TransactionMutations<{
  table: ReturnType<typeof hosted.createInitialTable>;
}>;
tx.rotateZone({ zoneId: "hand", direction: "left" });
// @ts-expect-error Attached hosts do not support seat rotation, even when named table.
tx.rotateZone({ zoneId: "attached", direction: "left" });
// @ts-expect-error Shared zones do not support seat rotation.
tx.rotateZone({ zoneId: "shared", direction: "left" });
