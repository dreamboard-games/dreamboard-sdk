import { createStateQueries } from "../../table-queries";
import type {
  RuntimeTableRecord,
  TableQueriesOfState,
  ZoneDefinitions,
} from "../../model";

export type ProjectionContext<
  State extends { table: RuntimeTableRecord },
  Definitions extends ZoneDefinitions,
> = {
  readonly domainState: State;
  readonly q: TableQueriesOfState<State, Definitions>;
};

export function createProjectionContext<
  State extends { table: RuntimeTableRecord },
  Definitions extends ZoneDefinitions,
>(options: {
  domainState: State;
  definitions: Definitions;
}): ProjectionContext<State, Definitions> {
  const q = createStateQueries(options.domainState, options.definitions);
  return {
    domainState: options.domainState,
    q,
  };
}
