import type {
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerReject,
  ReducerValidationResult,
  ViewOfContract,
} from "../../model";
import {
  collectFirstCardZoneId,
  findCardInputKey,
  findCardInputKeyForZone,
  interactionInputsOf,
} from "./collector-introspection";
import { parseInteractionParams } from "./collector-params";
import { createInteractionAuthorization } from "./interaction-authorization";
import { createInteractionDecisionResolver } from "./interaction-decision";
import {
  rejectResult,
  type TrustedInput,
  type TrustedPhaseName,
  type TrustedPlayerId,
  type TrustedRuntimeScope,
  type TrustedState,
} from "./runtime-scope";
import { evaluateStepPrefix } from "./step-prefix";
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
  type ReducerInput = TrustedInput<Contract>;
  type PhaseName = TrustedPhaseName<Contract, Definitions, View>;

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
        playerId: input.playerId,
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
    const invalidValidation = validation;
    return rejectResult(invalidValidation.errorCode, invalidValidation.message);
  }

  /**
   * The inputs of an interaction that name cards: its card inputs, or for
   * steps, the card steps selected so far and the current one.
   */
  function cardInputKeys(
    state: State,
    playerId: TrustedPlayerId<Contract>,
    interactionId: string,
  ): ReadonlySet<string> {
    const phaseName = state.flow.currentPhase as PhaseName;
    const interaction = scope.findInteractionInPhase(phaseName, interactionId);
    if (!interaction) return new Set();
    const pending = state.runtime.pending[playerId];
    const prefix = interaction.steps
      ? evaluateStepPrefix(
          interaction.steps,
          scope.toDomainState(state),
          playerId,
          pending?.phaseName === phaseName &&
            pending.interactionId === interactionId
            ? pending.values
            : [],
          scope.definition.contract.manifest,
        )
      : undefined;
    const collectors = prefix
      ? {
          ...prefix.collectors,
          ...(prefix.current
            ? { [prefix.current.key]: prefix.current.collector }
            : {}),
        }
      : interactionInputsOf(interaction);
    return new Set(
      Object.entries(collectors)
        .filter(([, collector]) => collector.kind === "card")
        .map(([key]) => key),
    );
  }

  return {
    cardInputKeys,
    currentClientParamSchema: decisions.currentClientParamSchema,
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
