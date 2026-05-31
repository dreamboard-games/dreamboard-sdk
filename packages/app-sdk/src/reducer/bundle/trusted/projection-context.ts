import { createDerivedResolver, type DerivedResolver } from "../../derived";
import { createReducerFx } from "../../effects";
import { createStateQueries } from "../../table-queries";
import type { RuntimeTableRecord, TableQueriesOfState } from "../../model";

type ProjectionFxState = {
  table: RuntimeTableRecord;
  flow: { currentPhase: string };
};

export type ProjectionContext<
  State extends { table: RuntimeTableRecord },
  FxState extends ProjectionFxState = ProjectionFxState,
> = {
  readonly domainState: State;
  readonly q: TableQueriesOfState<State>;
  readonly derived: DerivedResolver;
  readonly fx: ReturnType<typeof createReducerFx<FxState>>;
  readonly eligibleTargets: Map<string, string[]>;
  readonly stageAllowlists: Map<string, Set<string> | null>;
};

export function createProjectionContext<
  State extends { table: RuntimeTableRecord },
  FxState extends ProjectionFxState,
>(options: {
  domainState: State;
  combinedState: FxState;
}): ProjectionContext<State, FxState> {
  const q = createStateQueries(options.domainState);
  return {
    domainState: options.domainState,
    q,
    derived: createDerivedResolver(options.domainState, { q }),
    fx: createReducerFx(options.combinedState),
    eligibleTargets: new Map(),
    stageAllowlists: new Map(),
  };
}
