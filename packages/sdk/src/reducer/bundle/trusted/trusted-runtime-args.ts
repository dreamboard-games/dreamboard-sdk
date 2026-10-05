import type { ReducerTransaction, ReducerEdit } from "../../transaction";
import { createStateQueries } from "../../table-queries";
import type {
  BaseGameStateOfContract,
  ManifestContractOf,
  PlayerIdOfState,
  ReducerGameContractLike,
  RuntimeTableRecord,
  ZoneDefinitions,
  ReducerAccept,
  TableQueriesOfState,
} from "../../model";
import type {
  ActionContext,
  RandomHelpers,
} from "../../model/spec/runtime-args";
import type { TrustedState } from "./runtime-scope";

export function buildContext<Contract extends ReducerGameContractLike>(
  state: TrustedState<Contract>,
  manifest: ManifestContractOf<Contract>,
): ActionContext<
  BaseGameStateOfContract<Contract>,
  ManifestContractOf<Contract>
> {
  type DomainState = BaseGameStateOfContract<Contract>;
  type PlayerId = PlayerIdOfState<DomainState>;
  return {
    currentPhase: state.flow.currentPhase,
    manifest,
    playerOrder: [...state.table.playerOrder] as PlayerId[],
    activePlayers: [...state.flow.activePlayers] as PlayerId[],
    runtime: publicRuntime(state.runtime),
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

const implicitResultSymbol = Symbol("dreamboard.implicitResult");

export type RuntimeArgsWithTransaction<
  DomainState extends { table: RuntimeTableRecord },
  Definitions extends ZoneDefinitions,
> = {
  tx: ReducerTransaction<DomainState, string, Definitions>;
  [implicitResultSymbol]: () => ReducerAccept<DomainState>;
};

/**
 * Preserve the complete transaction on a bare return, without opening a
 * transaction when the callback never used one.
 */
export function implicitResultOf<
  DomainState extends { table: RuntimeTableRecord },
>(args: {
  [implicitResultSymbol]: () => ReducerAccept<DomainState>;
}): ReducerAccept<DomainState> {
  return args[implicitResultSymbol]();
}

export function buildRuntimeArgs<
  Contract extends ReducerGameContractLike,
  Extra extends object,
>(
  state: TrustedState<Contract>,
  manifest: ManifestContractOf<Contract>,
  createTransaction: ReducerEdit<
    BaseGameStateOfContract<Contract>,
    ManifestContractOf<Contract>
  >,
  toDomainState: (
    state: TrustedState<Contract>,
  ) => BaseGameStateOfContract<Contract>,
  extra: Extra,
  options: {
    q?: TableQueriesOfState<
      BaseGameStateOfContract<Contract>,
      ManifestContractOf<Contract>
    >;
    random?: import("./rng-sampler").MutableRandomHelpers;
  } = {},
) {
  type DomainState = BaseGameStateOfContract<Contract>;
  const domainState = toDomainState(state);
  const q = options.q ?? createStateQueries(domainState, manifest);
  const args = {
    ...buildContext(state, manifest),
    q,
    runtime: publicRuntime(state.runtime),
    random: options.random?.random ?? DISABLED_RANDOM_HELPERS,
    ...extra,
  };
  // The transaction clones the table, so open it only when a callback reads
  // `tx`. Views, actor selectors, and rules never pay for it.
  let transaction:
    | ReducerTransaction<DomainState, string, ManifestContractOf<Contract>>
    | undefined;
  Object.defineProperty(args, "tx", {
    enumerable: true,
    get: () => {
      if (!options.random)
        throw new Error(
          "Transactions are only available in reducer mutation callbacks.",
        );
      return (transaction ??= createTransaction(domainState, options.random));
    },
  });
  Object.defineProperty(args, implicitResultSymbol, {
    enumerable: false,
    value: () =>
      transaction
        ? transaction.accept()
        : { type: "accept", state: domainState, events: [] },
  });
  return args as typeof args &
    RuntimeArgsWithTransaction<DomainState, ManifestContractOf<Contract>>;
}
