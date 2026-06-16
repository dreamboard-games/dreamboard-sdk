import { createDerivedResolver } from "../../derived";
import type { DerivedResolver } from "../../derived";
import { createReducerFx } from "../../effects";
import { createStateQueries } from "../../table-queries";
import type {
  BaseGameStateOfContract,
  ManifestContractOf,
  PlayerIdOfState,
  ReducerGameContractLike,
  TableQueriesOfState,
} from "../../model";
import type {
  ActionContext,
  RandomHelpers,
} from "../../model/spec/runtime-args";
import type { TrustedRuntimeHelpers, TrustedState } from "./runtime-scope";

export function fxForState<Contract extends ReducerGameContractLike>() {
  return createReducerFx<TrustedState<Contract>>();
}

export function buildContext<Contract extends ReducerGameContractLike>(
  state: TrustedState<Contract>,
  manifest: ManifestContractOf<Contract>,
): ActionContext<
  BaseGameStateOfContract<Contract>,
  ManifestContractOf<Contract>
> {
  type DomainState = BaseGameStateOfContract<Contract>;
  type PlayerId = PlayerIdOfState<DomainState>;
  type Manifest = ManifestContractOf<Contract>;
  return {
    currentPhase: state.flow.currentPhase as ActionContext<
      DomainState,
      Manifest
    >["currentPhase"],
    manifest,
    playerOrder: [...state.table.playerOrder] as PlayerId[],
    activePlayers: [...state.flow.activePlayers] as PlayerId[],
    runtime: publicRuntime(state.runtime),
    setup: (state.runtime.setup
      ? {
          profileId: state.runtime.setup.profileId,
          optionValues: {
            ...state.runtime.setup.optionValues,
          },
        }
      : null) as ActionContext<DomainState, Manifest>["setup"],
  };
}

function publicRuntime<Runtime extends { rng?: unknown }>(
  runtime: Runtime,
): Omit<Runtime, "rng"> {
  const rest = { ...runtime } as Omit<Runtime, "rng"> & { rng?: unknown };
  delete rest.rng;
  return rest;
}

const DISABLED_RANDOM_HELPERS: RandomHelpers = {
  subset() {
    throw new Error(
      "random helpers are only available in reducer mutation callbacks.",
    );
  },
};

export function buildRuntimeArgs<
  Contract extends ReducerGameContractLike,
  Extra extends object,
>(
  state: TrustedState<Contract>,
  manifest: ManifestContractOf<Contract>,
  helpers: TrustedRuntimeHelpers<Contract>,
  toDomainState: (
    state: TrustedState<Contract>,
  ) => BaseGameStateOfContract<Contract>,
  extra: Extra,
  options: {
    q?: TableQueriesOfState<BaseGameStateOfContract<Contract>>;
    derived?: DerivedResolver;
    fx?: ReturnType<typeof createReducerFx<TrustedState<Contract>>>;
    random?: RandomHelpers;
  } = {},
) {
  const domainState = toDomainState(state);
  const q = options.q ?? createStateQueries(domainState);
  return {
    ...buildContext(state, manifest),
    ...helpers,
    fx: options.fx ?? fxForState<Contract>(),
    q,
    derived: options.derived ?? createDerivedResolver(domainState, { q }),
    runtime: publicRuntime(state.runtime),
    random: options.random ?? DISABLED_RANDOM_HELPERS,
    ...extra,
  };
}
