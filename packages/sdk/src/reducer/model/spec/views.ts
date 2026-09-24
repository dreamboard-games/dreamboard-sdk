import type { RuntimeTableRecord } from "../table";
import type { ManifestContract } from "../manifest";
import type { PlayerIdOfState, TableOfState } from "../extract";
import type { ActionContext, ReadHelpers } from "./runtime-args";

/** A projection for exactly one seat. Never used as a public spectator view. */
export type ViewDefinition<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
  Projection = unknown,
> = (
  args: ActionContext<State, Manifest> &
    ReadHelpers<State> & {
      state: State;
      playerId: PlayerIdOfState<State>;
    },
) => Projection;
