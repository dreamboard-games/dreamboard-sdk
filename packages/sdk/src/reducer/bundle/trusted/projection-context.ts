import { createStateQueries } from "../../table-queries";
import type {
  RuntimeTableRecord,
  TableQueriesOfState,
  ZoneDefinitions,
} from "../../model";

export type ProjectionContext<State extends { table: RuntimeTableRecord }> = {
  readonly domainState: State;
  readonly q: TableQueriesOfState<State>;
};

export function createProjectionContext<
  State extends { table: RuntimeTableRecord },
>(options: {
  domainState: State;
  definitions: ZoneDefinitions;
}): ProjectionContext<State> {
  const q = createStateQueries(options.domainState, options.definitions);
  return {
    domainState: options.domainState,
    q,
  };
}
