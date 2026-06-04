import type {
  AnyInteractionSpec,
  PhaseMapOf,
  ReducerGameContractLike,
  StageSpec,
  ViewMapOf,
} from "../../model";
import type {
  TrustedDomainState,
  TrustedManifest,
  TrustedPhaseName,
  TrustedRuntimeScope,
  TrustedState,
} from "./runtime-scope";
import type { ProjectionContext } from "./projection-context";

export function createStageResolver<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(scope: TrustedRuntimeScope<Contract, Definitions, Views>) {
  type DomainState = TrustedDomainState<Contract>;
  type Manifest = TrustedManifest<Contract>;
  type State = TrustedState<Contract>;
  type PhaseName = TrustedPhaseName<Contract, Definitions, Views>;

  function resolveActiveStage(
    state: State,
    phaseName: PhaseName,
    projection?: ProjectionContext<DomainState, State>,
  ): { id: string; stage: StageSpec<DomainState, Manifest> } | null {
    const stages = scope.stagesForPhase(phaseName);
    if (stages.length === 0) return null;
    const domainState = projection?.domainState ?? scope.toDomainState(state);
    const context = scope.buildContext(state);
    for (const [stageId, stage] of stages) {
      const matches = stage.when
        ? stage.when({
            ...context,
            state: domainState,
          })
        : true;
      if (matches) return { id: stageId, stage };
    }
    return null;
  }

  function resolveActiveStageAllowlist(
    state: State,
    phaseName: PhaseName,
    projection?: ProjectionContext<DomainState, State>,
  ): Set<string> | null {
    const cacheKey = String(phaseName);
    if (projection?.stageAllowlists.has(cacheKey)) {
      return projection.stageAllowlists.get(cacheKey) ?? null;
    }
    const activeStage = resolveActiveStage(state, phaseName, projection);
    const allowlist = activeStage ? new Set(activeStage.stage.allow) : null;
    projection?.stageAllowlists.set(cacheKey, allowlist);
    return allowlist;
  }

  function isInteractionAllowedInStep(
    state: State,
    interaction: AnyInteractionSpec<DomainState, Manifest>,
    projection?: ProjectionContext<DomainState, State>,
  ): boolean {
    const allowedSteps = interaction.__steps ?? [];
    if (allowedSteps.length === 0) {
      return true;
    }
    const currentStep = (
      (projection?.domainState ?? scope.toDomainState(state)).phase as {
        step?: unknown;
      }
    ).step;
    return (
      typeof currentStep === "string" && allowedSteps.includes(currentStep)
    );
  }

  return {
    isInteractionAllowedInStep,
    resolveActiveStage,
    resolveActiveStageAllowlist,
  };
}
