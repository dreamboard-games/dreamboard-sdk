import { createDerivedResolver } from "../../derived";
import type { DerivedResolver } from "../../derived";
import { createReducerFx } from "../../effects";
import type { ReducerTransaction } from "../../transaction";
import { createStateQueries } from "../../table-queries";
import type {
  BaseGameStateOfContract,
  ManifestContractOf,
  PlayerIdOfState,
  ReducerGameContractLike,
  RuntimeTableRecord,
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
  integer() {
    throw new Error(
      "random helpers are only available in reducer mutation callbacks.",
    );
  },
  subset() {
    throw new Error(
      "random helpers are only available in reducer mutation callbacks.",
    );
  },
};

const resultStateSymbol = Symbol("dreamboard.resultState");

export type RuntimeArgsWithTransaction<
  DomainState extends { table: RuntimeTableRecord },
> = {
  tx: ReducerTransaction<DomainState>;
  [resultStateSymbol]: () => DomainState;
};

/**
 * The state a mutation callback accepted implicitly (bare `return`): the
 * transaction's current state when the callback opened one, otherwise the
 * untouched domain state. Never opens a transaction just to read it.
 */
export function resultStateOf<
  DomainState extends { table: RuntimeTableRecord },
>(args: RuntimeArgsWithTransaction<DomainState>): DomainState {
  return args[resultStateSymbol]();
}

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
  type DomainState = BaseGameStateOfContract<Contract>;
  const domainState = toDomainState(state);
  const q = options.q ?? createStateQueries(domainState);
  // Legacy helpers (`accept`, `edit`, `fx`, `ops`, `reject`, `endGame`) stay
  // on the runtime object for the SDK's own test suite. They are no longer
  // part of any public argument type and will be removed with those tests.
  const args = {
    ...buildContext(state, manifest),
    ...helpers,
    fx: options.fx ?? fxForState<Contract>(),
    q,
    derived: options.derived ?? createDerivedResolver(domainState, { q }),
    runtime: publicRuntime(state.runtime),
    random: options.random ?? DISABLED_RANDOM_HELPERS,
    ...extra,
  };
  // The transaction clones the table, so open it only when a callback reads
  // `tx`. Views, actor selectors, and rules never pay for it.
  let transaction: ReducerTransaction<DomainState> | undefined;
  Object.defineProperty(args, "tx", {
    enumerable: true,
    get: () => (transaction ??= helpers.edit(domainState)),
  });
  Object.defineProperty(args, resultStateSymbol, {
    enumerable: false,
    value: () => (transaction ? transaction.state : domainState),
  });
  return args as typeof args & RuntimeArgsWithTransaction<DomainState>;
}
