import type { PlayerId } from "../per-player";
import type {
  PlayerZoneIdOfTable,
  SharedZoneIdOfTable,
  ZoneArg,
} from "./extract";
import type { TableQueries } from "./queries";
import type { RuntimeTableRecord, ZoneHostMap } from "./table";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Assert<T extends true> = T;
type ExactTable = Omit<RuntimeTableRecord, "zones"> & {
  zones: {
    draw: ZoneHostMap<"table", string, "shared">;
    hand: ZoneHostMap<PlayerId, string, "perPlayer">;
  };
};
type ExactShared = Assert<Equal<SharedZoneIdOfTable<ExactTable>, "draw">>;
type ExactPlayer = Assert<Equal<PlayerZoneIdOfTable<ExactTable>, "hand">>;
type DynamicShared = Assert<
  Equal<SharedZoneIdOfTable<RuntimeTableRecord>, string>
>;
type DynamicPlayer = Assert<
  Equal<PlayerZoneIdOfTable<RuntimeTableRecord>, string>
>;
declare const exact: TableQueries<ExactTable>;
declare const dynamic: TableQueries<RuntimeTableRecord>;
declare const player: PlayerId;
exact.zone("draw");
exact.zone("hand", player);
// @ts-expect-error An exact player zone always requires its host.
exact.zone("hand");
// @ts-expect-error An exact shared zone cannot use a player host.
exact.zone("draw", player);
dynamic.zone("runtime-zone");
dynamic.zone("runtime-zone", player);
const shared: ZoneArg<RuntimeTableRecord> = { zoneId: "runtime-zone" };
const hosted: ZoneArg<RuntimeTableRecord> = {
  zoneId: "runtime-zone",
  hostId: player,
};
export type ZoneScopeProofs = [
  ExactShared,
  ExactPlayer,
  DynamicShared,
  DynamicPlayer,
];
void [shared, hosted];
