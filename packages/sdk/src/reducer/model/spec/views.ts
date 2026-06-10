import type { RuntimeTableRecord } from "../table";
import type { ManifestContract } from "../manifest";
import type { PlayerIdOfState, TableOfState } from "../extract";
import type {
  ActionContext,
  RuntimeHelpers,
  StaticViewQueries,
} from "./runtime-args";

export type ViewDefinition<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
  Projection = unknown,
> = {
  project: (
    args: ActionContext<State, Manifest> &
      RuntimeHelpers<State> & {
        state: State;
        playerId: PlayerIdOfState<State>;
        runtime: State extends {
          runtime: infer RuntimeStateValue;
        }
          ? RuntimeStateValue
          : never;
      },
  ) => Projection;
};

/**
 * Session-scoped, once-per-init view. The `project` callback receives only
 * the authored manifest — the mutable-state helpers (`state`, `playerId`,
 * `runtime`, `fx`, `ops`, `accept`, `reject`, `q`) that `ViewDefinition.project`
 * exposes are structurally absent, so an author cannot accidentally project
 * per-tick state into the payload. The host calls this once per reducer
 * session, caches the result, and merges it back into every seat view on
 * the client. Moving static board topology here is what lets the adapter
 * skip the ~87% of `projectSeatsDynamic` wall time that used to re-serialize
 * manifest-sourced fields on every input.
 */
export type StaticViewDefinition<
  Manifest extends ManifestContract<RuntimeTableRecord>,
  Projection = unknown,
> = {
  project: (args: {
    manifest: Manifest;
    q: StaticViewQueries<Manifest>;
  }) => Projection;
};
