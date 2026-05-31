import type {
  AnyInteractionSpec,
  PhaseMapOf,
  ReducerGameContractLike,
  ViewMapOf,
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
  Views extends ViewMapOf<Contract>,
> = ReturnType<
  TrustedRuntimeScope<Contract, Definitions, Views>["phaseByName"]
>;

export function isSimultaneousPhase<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(phase: ErasedPhase<Contract, Definitions, Views>): boolean {
  return phase.kind === "simultaneousPlayer";
}

export function simultaneousSubmitInteraction<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  phase: ErasedPhase<Contract, Definitions, Views>,
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
  value: unknown,
): PlayerId[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value as PlayerId[];
  if (typeof value === "string") return [value as PlayerId];
  return [];
}

export function resolveSimultaneousActors<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  scope: TrustedRuntimeScope<Contract, Definitions, Views>,
  state: TrustedState<Contract>,
  phase: ErasedPhase<Contract, Definitions, Views>,
  projection?: ProjectionContext<
    TrustedDomainState<Contract>,
    TrustedState<Contract>
  >,
): TrustedPlayerId<Contract>[] {
  type PlayerId = TrustedPlayerId<Contract>;
  const selector =
    (phase as { actors?: unknown; actor?: unknown }).actors ??
    (phase as { actor?: unknown }).actor;
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
