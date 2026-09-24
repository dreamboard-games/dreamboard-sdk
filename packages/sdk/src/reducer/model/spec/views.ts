import type { RuntimeTableRecord } from "../table";
import type { ManifestContract } from "../manifest";
import type { PlayerIdOfState, TableOfState } from "../extract";
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
    ReadHelpers<State> & {
      state: State;
      playerId: PlayerIdOfState<State>;
    },
) => Projection;
