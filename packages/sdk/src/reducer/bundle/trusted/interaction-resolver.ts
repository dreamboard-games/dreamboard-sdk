import type {
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerReject,
  ReducerValidationResult,
  ViewOfContract,
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
  View extends ViewOfContract<Contract>,
>(
  scope: TrustedRuntimeScope<Contract, Definitions, View>,
  options: { diagnostics?: InteractionDiagnosticsMode } = {},
) {
  type State = TrustedState<Contract>;
  type PlayerId = TrustedPlayerId<Contract>;
  type ReducerInput = TrustedInput<Contract>;

  const authorization = createInteractionAuthorization(scope);
  const decisions = createInteractionDecisionResolver(
    scope,
    authorization,
    options,
  );

  function validateClientInput(
    state: State,
    input: ReducerInput,
  ): ReducerValidationResult {
    if (input.kind === "interaction.cancel") {
      const pending = state.runtime.pending[input.playerId];
      return pending?.interactionId === input.interactionId
        ? { valid: true }
        : {
            valid: false,
            errorCode: "NO_PENDING_INTERACTION",
            message: "There is no matching unsealed interaction to cancel.",
          };
    }
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
    currentClientParamSchema: decisions.currentClientParamSchema,
    collectEligibleTargets,
    collectFirstCardZoneId,
    enumerateInteractionParams: decisions.enumerateInteractionParams,
    explainInteraction: decisions.explainInteraction,
    findCardInputKey,
    findCardInputKeyForZone,
    isActorAuthorized: authorization.isActorAuthorized,
    parseInteractionParams,
    resolveAvailableInteractionsFor: decisions.resolveAvailableInteractionsFor,
    resolveInteractionActionability: decisions.resolveInteractionActionability,
    resolveInteractionActorAuthorization:
      authorization.resolveInteractionActorAuthorization,
    resolveInteractionDecision: decisions.resolveInteractionDecision,
    resolveInteractionEligibility: decisions.resolveInteractionEligibility,
    validateClientInput,
    validateOrReject,
  };
}
