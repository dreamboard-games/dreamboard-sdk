import type { AuthoredView } from "../../../shared/runtime-types";
import type { RuntimeTableRecord } from "../table";
import type { ManifestContract } from "../manifest";
import type { PlayerIdOfState, TableOfState } from "../extract";
import type { ActionContext, ReadHelpers } from "./runtime-args";

/** A JSON record for exactly one seat. `boards` is reserved for manifest geometry. */
export type ViewDefinition<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
  Projection extends AuthoredView = AuthoredView,
> = (
  args: ActionContext<State, Manifest> &
    ReadHelpers<State> & {
      state: State;
      playerId: PlayerIdOfState<State>;
    },
) => Projection;
