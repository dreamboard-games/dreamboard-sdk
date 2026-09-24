import { createStateQueries } from "../../table-queries";
import type { RuntimeTableRecord, TableQueriesOfState } from "../../model";

export type ProjectionContext<State extends { table: RuntimeTableRecord }> = {
  readonly domainState: State;
  readonly q: TableQueriesOfState<State>;
  readonly eligibleTargets: Map<string, string[]>;
};

export function createProjectionContext<
  State extends { table: RuntimeTableRecord },
>(options: { domainState: State }): ProjectionContext<State> {
  const q = createStateQueries(options.domainState);
  return {
    domainState: options.domainState,
    q,
    eligibleTargets: new Map(),
  };
}
