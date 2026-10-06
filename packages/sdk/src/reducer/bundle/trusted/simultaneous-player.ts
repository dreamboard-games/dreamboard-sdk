import type {
  AnyInteractionSpec,
  PhaseMapOf,
  ReducerGameContractLike,
  ViewOfContract,
} from "../../model";
import type { ProjectionContext } from "./projection-context";
import type {
  TrustedDomainState,
  TrustedManifest,
  TrustedPlayerId,
  TrustedRuntimeScope,
  TrustedState,
} from "./runtime-scope";

export const SIMULTANEOUS_SUBMIT_INTERACTION_ID = "submit";

type ErasedPhase<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
> = ReturnType<TrustedRuntimeScope<Contract, Definitions, View>["phaseByName"]>;

export function isSimultaneousPhase<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(phase: ErasedPhase<Contract, Definitions, View>): boolean {
  return phase.kind === "simultaneousPlayer";
}

export function simultaneousSubmitInteraction<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  phase: ErasedPhase<Contract, Definitions, View>,
):
  | AnyInteractionSpec<TrustedDomainState<Contract>, TrustedManifest<Contract>>
  | undefined {
  return (phase as { submit?: unknown }).submit as
    | AnyInteractionSpec<
        TrustedDomainState<Contract>,
        TrustedManifest<Contract>
      >
    | undefined;
}

function resolvePromptToArray<PlayerId extends string>(
  value: PlayerId | readonly PlayerId[] | null | undefined,
): PlayerId[] {
  if (value === undefined || value === null) return [];
  return typeof value === "string" ? [value] : [...value];
}

export function resolveSimultaneousActors<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  scope: TrustedRuntimeScope<Contract, Definitions, View>,
  state: TrustedState<Contract>,
  phase: ErasedPhase<Contract, Definitions, View>,
  projection?: ProjectionContext<
    TrustedDomainState<Contract>,
    TrustedManifest<Contract>
  >,
): TrustedPlayerId<Contract>[] {
  type PlayerId = TrustedPlayerId<Contract>;
  const selector = phase.actors ?? phase.actor;
  if (typeof selector === "function") {
    const selected = selector(
      scope.buildRuntimeArgs(
        state,
        {
          state: projection?.domainState ?? scope.toDomainState(state),
        },
        projection,
      ),
    );
    const resolved = resolvePromptToArray<PlayerId>(selected);
    if (resolved.length > 0) {
      return resolved;
    }
  }
  const active = state.flow.activePlayers as PlayerId[];
  if (active.length > 0) {
    return [...active];
  }
  return [...(state.table.playerOrder as PlayerId[])];
}
