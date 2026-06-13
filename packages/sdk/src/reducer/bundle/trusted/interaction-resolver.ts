import type {
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerReject,
  ReducerValidationResult,
  ViewMapOf,
} from "../../model";
import { collectEligibleTargets } from "./collector-eligibility";
import {
  collectFirstCardZoneId,
  findCardInputKey,
  findCardInputKeyForZone,
} from "./collector-introspection";
import { parseInteractionParams } from "./collector-params";
import { createInteractionAuthorization } from "./interaction-authorization";
import { createInteractionDecisionResolver } from "./interaction-decision";
import { createStageResolver } from "./stage-resolver";
import {
  rejectResult,
  type TrustedInput,
  type TrustedPlayerId,
  type TrustedRuntimeScope,
  type TrustedState,
} from "./runtime-scope";
import type { InteractionDiagnosticsMode } from "./interaction-types";

export type { InteractionDescriptorShape } from "./interaction-types";

export function createInteractionResolver<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  scope: TrustedRuntimeScope<Contract, Definitions, Views>,
  options: { diagnostics?: InteractionDiagnosticsMode } = {},
) {
  type State = TrustedState<Contract>;
  type PlayerId = TrustedPlayerId<Contract>;
  type ReducerInput = TrustedInput<Contract>;

  const stages = createStageResolver(scope);
  const authorization = createInteractionAuthorization(scope);
  const decisions = createInteractionDecisionResolver(
    scope,
    stages,
    authorization,
    options,
  );

  function validateClientInput(
    state: State,
    input: ReducerInput,
  ): ReducerValidationResult {
    if (input.kind === "interaction") {
      const decision = decisions.resolveInteractionDecision({
        state,
        playerId: input.playerId as PlayerId,
        interactionId: input.interactionId,
        params: (input.params ?? {}) as Record<string, unknown>,
        mode: "submit",
      });
      return decision.validation;
    }
    return { valid: true };
  }

  function validateOrReject(
    state: State,
    input: ReducerInput,
  ): ReducerReject | null {
    const validation = validateClientInput(state, input);
    if (validation.valid) {
      return null;
    }
    const invalidValidation = validation as Exclude<
      ReducerValidationResult,
      { valid: true }
    >;
    return rejectResult(invalidValidation.errorCode, invalidValidation.message);
  }

  return {
    collectEligibleTargets,
    collectFirstCardZoneId,
    evaluateInteractionCost: decisions.evaluateInteractionCost,
    explainInteraction: decisions.explainInteraction,
    findCardInputKey,
    findCardInputKeyForZone,
    isActorAuthorized: authorization.isActorAuthorized,
    isInteractionAllowedInStep: stages.isInteractionAllowedInStep,
    parseInteractionParams,
    resolveActiveStage: stages.resolveActiveStage,
    resolveActiveStageAllowlist: stages.resolveActiveStageAllowlist,
    resolveAvailableInteractionsFor: decisions.resolveAvailableInteractionsFor,
    resolveInteractionActorAuthorization:
      authorization.resolveInteractionActorAuthorization,
    resolveInteractionDecision: decisions.resolveInteractionDecision,
    validateClientInput,
    validateOrReject,
  };
}
