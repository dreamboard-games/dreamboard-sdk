import type { RuntimeTableRecord } from "../table";
import type { ManifestContract } from "../manifest";
import type {
  PlayerIdOfState,
  TableOfState,
  TileIdOfTable,
  BoardIdOfTable,
  SpaceIdOfTable,
} from "../extract";
import type { SeatTileRef } from "../../../shared/domain/seat-reference.js";
import type { ActionContext, ReadHelpers } from "./runtime-args";

/** Authored fields retain their domain types; wire admission validates JSON. */
export type ViewData = Record<string, unknown> & { readonly boards?: never };

/** A JSON record for exactly one seat. `boards` is reserved for manifest geometry. */
export type ViewDefinition<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
  Projection extends ViewData = ViewData,
> = (
  args: ActionContext<State, Manifest> &
    ReadHelpers<State, Manifest> & {
      state: State;
      playerId: PlayerIdOfState<State>;
      /** Explicitly publish a visible seat reference in a game-owned view field. */
      references: {
        tile(id: TileIdOfTable<TableOfState<State>>): SeatTileRef | null;
        space<BoardId extends BoardIdOfTable<TableOfState<State>>>(
          boardId: BoardId,
          spaceId: SpaceIdOfTable<TableOfState<State>, BoardId, Manifest>,
        ): string | null;
      };
    },
) => Projection;
