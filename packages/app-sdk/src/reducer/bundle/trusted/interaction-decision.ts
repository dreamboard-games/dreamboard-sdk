import { createStateQueries } from "../../table-queries";
import type {
  AnyInteractionSpec,
  InputCollector,
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerValidationResult,
  ViewMapOf,
} from "../../model";
import {
  collectCardZoneIds,
  collectFirstCardZoneId,
  collectInteractionInputs,
  collectPromptOptions,
  interactionInputsOf,
  parseInteractionParams,
  prepareInteractionProjectionParams,
  validateCollectorTargets,
} from "./interaction-collectors";
import type { createInteractionAuthorization } from "./interaction-authorization";
import type { createStageResolver } from "./stage-resolver";
import {
  makeValidationError,
  type InteractionDecisionResult,
  type InteractionAvailabilityShape,
  type InteractionDescriptorShape,
  type ResolveDecisionInput,
  type TrustedInteractionDescriptorShape,
  type TrustedInteractionId,
} from "./interaction-types";
import type { ProjectionContext } from "./projection-context";
import {
  isSimultaneousPhase,
  SIMULTANEOUS_SUBMIT_INTERACTION_ID,
} from "./simultaneous-player";
import type {
  TrustedDomainState,
  TrustedManifest,
  TrustedPhaseName,
  TrustedPlayerId,
  TrustedRuntimeScope,
  TrustedState,
} from "./runtime-scope";

type StageResolverFor<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = ReturnType<typeof createStageResolver<Contract, Definitions, Views>>;

type AuthorizationFor<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = ReturnType<
  typeof createInteractionAuthorization<Contract, Definitions, Views>
>;

type InteractionRuleIssue = {
  errorCode: string;
  message?: string;
};

function issueFromRule(rule: InteractionRuleIssue): InteractionRuleIssue {
  return { errorCode: rule.errorCode, message: rule.message };
}

function issueFromRuleValidationResult(
  rule: InteractionRuleIssue,
  result: boolean | InteractionRuleIssue | null | undefined,
): InteractionRuleIssue | undefined {
  if (result === false) return issueFromRule(rule);
  if (result && typeof result === "object") return result;
  return undefined;
}

function humanizeInteractionId(id: string): string {
  if (!id) return id;
  const withSpaces = id
    .replace(/[-_]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
  if (!withSpaces) return id;
  return withSpaces
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function deriveInteractionKind(
  inputs: Record<string, InputCollector>,
): "action" | "prompt" {
  for (const collector of Object.values(inputs)) {
    if (collector.kind === "prompt") {
      return "prompt";
    }
  }
  return "action";
}

function isTargetCollector(collector: InputCollector): boolean {
  switch (collector.kind) {
    case "card":
    case "board-edge":
    case "board-space":
    case "board-tile":
    case "board-vertex":
      return true;
    default:
      return false;
  }
}

function isManyCollector(collector: InputCollector): boolean {
  return collector.selection?.mode === "many";
}

function terminalCollectorsForInputs(
  inputs: Record<string, InputCollector>,
): InputCollector[] {
  const terminalKeys = new Set(Object.keys(inputs));
  for (const collector of Object.values(inputs)) {
    for (const dependencyKey of collector.dependsOn ?? []) {
      terminalKeys.delete(dependencyKey);
    }
  }
  const collectors: InputCollector[] = [];
  for (const key of terminalKeys) {
    const collector = inputs[key];
    if (collector) collectors.push(collector);
  }
  return collectors;
}

function deriveCommitPolicy(
  inputs: Record<string, InputCollector>,
  explicit: InteractionDescriptorShape["commit"] | undefined,
): InteractionDescriptorShape["commit"] {
  const collectors = Object.values(inputs);
  const hasManyCollector = collectors.some(isManyCollector);
  if (explicit) {
    if (explicit.mode === "autoWhenReady" && hasManyCollector) {
      throw new Error(
        'Interactions with many(...) inputs must use commit: { mode: "manual" }.',
      );
    }
    return explicit;
  }
  if (hasManyCollector) {
    return { mode: "manual" };
  }
  if (collectors.length === 0 || !collectors.some(isTargetCollector)) {
    return { mode: "manual" };
  }
  const terminalCollectors = terminalCollectorsForInputs(inputs);
  if (terminalCollectors.length === 0) {
    return { mode: "manual" };
  }
  return terminalCollectors.every(
    (collector) => isTargetCollector(collector) || collector.kind === "rng",
  ) && terminalCollectors.some(isTargetCollector)
    ? { mode: "autoWhenReady" }
    : { mode: "manual" };
}

function projectInteractionMetadata(interaction: {
  inputs: Record<string, InputCollector>;
  commit?: InteractionDescriptorShape["commit"];
}): Pick<InteractionDescriptorShape, "kind" | "commit"> {
  return {
    kind: deriveInteractionKind(interaction.inputs),
    commit: deriveCommitPolicy(interaction.inputs, interaction.commit),
  };
}

function enrichResourceInputPresentation(
  inputs: InteractionDescriptorShape["inputs"],
  manifest: { literals?: { resourcePresentationById?: unknown } },
): InteractionDescriptorShape["inputs"] {
  const presentationById = manifest.literals?.resourcePresentationById;
  if (!presentationById || typeof presentationById !== "object") {
    return inputs;
  }
  const resources = presentationById as Record<
    string,
    { label?: unknown; icon?: unknown }
  >;
  const enrichChoice = <
    Choice extends { value: string | null; label: string; icon?: string },
  >(
    choice: Choice,
  ): Choice & { icon?: string } => {
    const presentation =
      choice.value === null ? undefined : resources[choice.value];
    return {
      ...choice,
      label:
        typeof presentation?.label === "string" &&
        (!choice.label || choice.label === choice.value)
          ? presentation.label
          : choice.label ||
            (typeof presentation?.label === "string" ? presentation.label : ""),
      icon:
        choice.icon ??
        (typeof presentation?.icon === "string"
          ? presentation.icon
          : undefined),
    };
  };
  return inputs.map((input) => {
    if (input.domain.type === "choice") {
      return {
        ...input,
        domain: {
          ...input.domain,
          choices: input.domain.choices.map(enrichChoice),
        },
      };
    }
    if (input.domain.type === "choiceList") {
      return {
        ...input,
        domain: {
          ...input.domain,
          choices: input.domain.choices.map(enrichChoice),
        },
      };
    }
    if (input.domain.type !== "resourceMap") return input;
    return {
      ...input,
      domain: {
        ...input.domain,
        resources: input.domain.resources.map((entry) => {
          const presentation = resources[entry.resourceId];
          return {
            ...entry,
            label:
              entry.label ??
              (typeof presentation?.label === "string"
                ? presentation.label
                : undefined),
            icon:
              entry.icon ??
              (typeof presentation?.icon === "string"
                ? presentation.icon
                : undefined),
          };
        }),
      },
    };
  });
}

function interactionAvailabilityFromDecision(decision: {
  available: boolean;
  unavailableReason?: string;
  missingResources?: Record<string, number>;
}): InteractionAvailabilityShape {
  if (decision.available) return { status: "available" };
  if (decision.unavailableReason === "Not your turn") {
    return { status: "notYourTurn", reason: decision.unavailableReason };
  }
  if (decision.unavailableReason === "INSUFFICIENT_RESOURCES") {
    return {
      status: "insufficientResources",
      reason: decision.unavailableReason,
      missingResources: { ...(decision.missingResources ?? {}) },
    };
  }
  return {
    status: "blocked",
    reason: decision.unavailableReason ?? "Interaction unavailable",
  };
}

export function createInteractionDecisionResolver<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  scope: TrustedRuntimeScope<Contract, Definitions, Views>,
  stages: StageResolverFor<Contract, Definitions, Views>,
  authorization: AuthorizationFor<Contract, Definitions, Views>,
) {
  type DomainState = TrustedDomainState<Contract>;
  type Manifest = TrustedManifest<Contract>;
  type State = TrustedState<Contract>;
  type PhaseName = TrustedPhaseName<Contract, Definitions, Views>;
  type PlayerId = TrustedPlayerId<Contract>;
  type InteractionId = TrustedInteractionId<Contract, Definitions, Views>;
  type Descriptor = TrustedInteractionDescriptorShape<
    Contract,
    Definitions,
    Views
  >;

  function evaluateInteractionCost(
    state: State,
    interaction: AnyInteractionSpec<DomainState, Manifest>,
    playerId: PlayerId,
    params: Record<string, unknown>,
    projection?: ProjectionContext<DomainState, State>,
  ):
    | { cost?: Record<string, number>; missing?: Record<string, number> }
    | { error: unknown } {
    if (!interaction.cost) {
      return {};
    }
    const args = scope.buildRuntimeArgs(
      state,
      {
        state: projection?.domainState ?? scope.toDomainState(state),
        input: { playerId, params },
      },
      projection,
    );
    try {
      const cost = { ...interaction.cost(args) };
      const typedCost = cost as Parameters<typeof args.q.player.canAfford>[1];
      const missing = args.q.player.canAfford(playerId, typedCost)
        ? {}
        : { ...args.q.player.missingResources(playerId, typedCost) };
      return { cost, missing };
    } catch (error) {
      return { error };
    }
  }

  function buildBaseDescriptor(
    state: State,
    playerId: PlayerId,
    interactionId: InteractionId,
    interaction: AnyInteractionSpec<DomainState, Manifest>,
    decision: {
      available: boolean;
      unavailableReason?: string;
      cost?: Record<string, number>;
      missingResources?: Record<string, number>;
    },
    options: {
      projection?: ProjectionContext<DomainState, State>;
      includeEligibleTargets?: boolean;
    } = {},
  ): Descriptor {
    const domainState =
      options.projection?.domainState ?? scope.toDomainState(state);
    const phaseName = state.flow.currentPhase as PhaseName;
    const interactionInputs = interactionInputsOf(interaction);
    const metadata = projectInteractionMetadata({
      ...interaction,
      inputs: interactionInputs,
    });
    const queries = options.projection?.q ?? createStateQueries(domainState);
    const derived = options.projection?.derived;
    const shouldMaterializeInputDomains =
      decision.available || decision.unavailableReason !== "Not your turn";
    const promptContext =
      metadata.kind === "prompt"
        ? {
            to: playerId,
            title: humanizeInteractionId(interactionId),
            options: shouldMaterializeInputDomains
              ? collectPromptOptions(
                  { inputs: interactionInputs },
                  domainState,
                  playerId as unknown as string,
                  queries,
                )
              : undefined,
          }
        : undefined;
    const inputs = shouldMaterializeInputDomains
      ? enrichResourceInputPresentation(
          collectInteractionInputs(interaction, domainState, playerId, {
            queries,
            derived,
            eligibleTargetCache: options.projection?.eligibleTargets,
            eligibleTargetCachePrefix: `${phaseName}:${String(
              interactionId,
            )}:${String(playerId)}`,
            includeEligibleTargets: options.includeEligibleTargets,
          }),
          scope.definition.contract.manifest,
        )
      : [];
    const baseDescriptor = {
      phaseName,
      interactionKey: `${phaseName}.${interactionId}`,
      interactionId,
      commit: metadata.commit,
      zoneId: collectFirstCardZoneId(interaction),
      zoneIds: collectCardZoneIds(interaction),
      inputs,
      cost: decision.cost ? { ...decision.cost } : undefined,
      currentResources: decision.cost
        ? {
            ...(queries.player.resources(playerId) as
              | Record<string, number>
              | undefined),
          }
        : undefined,
      availability: interactionAvailabilityFromDecision(decision),
    };
    if (metadata.kind === "prompt") {
      return {
        ...baseDescriptor,
        kind: "prompt",
        context: promptContext ?? {
          to: playerId,
          title: humanizeInteractionId(interactionId),
        },
      } as Descriptor;
    }
    return {
      ...baseDescriptor,
      kind: "action",
    } as Descriptor;
  }

  function resolveInteractionDecision({
    state,
    playerId,
    interactionId,
    params = {},
    mode,
    projection,
  }: ResolveDecisionInput<
    Contract,
    Definitions,
    Views
  >): InteractionDecisionResult<Contract, Definitions, Views> {
    const phaseName = state.flow.currentPhase as PhaseName;
    const interaction = scope.findInteractionInPhase(phaseName, interactionId);
    if (!interaction) {
      return {
        found: false,
        validation: makeValidationError(
          "unsupported-action",
          `Interaction '${interactionId}' is not available in phase '${state.flow.currentPhase}'.`,
        ),
      };
    }
    const trustedInteractionId = interactionId as InteractionId;

    const parseForSubmit = mode === "submit";
    const parsed = parseForSubmit
      ? parseInteractionParams(interaction, params, {
          skipRng: true,
          playerId,
        })
      : ({
          ok: true,
          params: prepareInteractionProjectionParams(interaction, params),
        } as const);
    if (!parsed.ok) {
      return {
        found: true,
        interaction,
        parsedParams: {},
        visible: true,
        descriptor: buildBaseDescriptor(
          state,
          playerId,
          trustedInteractionId,
          interaction,
          {
            available: false,
            unavailableReason: parsed.message,
          },
          { projection, includeEligibleTargets: false },
        ),
        validation: makeValidationError(
          "invalid-action-params",
          parsed.message,
        ),
      };
    }

    const phase = scope.phaseByName(phaseName);
    const isSimultaneousSubmit =
      isSimultaneousPhase(phase) &&
      interactionId === SIMULTANEOUS_SUBMIT_INTERACTION_ID;
    const alreadySubmitted =
      isSimultaneousSubmit &&
      state.runtime.simultaneous?.current?.phaseName === phaseName &&
      Boolean(state.runtime.simultaneous.current.submissions[playerId]);
    const canResubmit =
      isSimultaneousSubmit &&
      (phase as { canResubmit?: boolean }).canResubmit === true;

    const actorAuthorization =
      authorization.resolveInteractionActorAuthorization(
        state,
        interaction,
        projection,
      );
    const authorized = authorization.isActorAuthorized(
      state,
      playerId,
      actorAuthorization,
    );
    let visible = authorization.isInteractionVisible(
      interaction,
      actorAuthorization,
      authorized,
    );
    if (alreadySubmitted && !canResubmit && mode !== "submit") {
      visible = false;
    }
    const stageAllow = stages.resolveActiveStageAllowlist(
      state,
      phaseName,
      projection,
    );
    const stageAllowed = !stageAllow || stageAllow.has(interactionId);
    const stepAllowed = stages.isInteractionAllowedInStep(
      state,
      interaction,
      projection,
    );

    let validation: ReducerValidationResult = { valid: true };
    if (!authorized) {
      validation =
        actorAuthorization.mode === "addressees"
          ? makeValidationError(
              "prompt-not-owned",
              `Interaction '${interactionId}' is not addressed to '${playerId}'.`,
            )
          : makeValidationError(
              "NOT_YOUR_TURN",
              `It is not your turn (interaction '${interactionId}').`,
            );
    } else if (alreadySubmitted && !canResubmit) {
      validation = makeValidationError(
        "ALREADY_SUBMITTED",
        `Interaction '${interactionId}' has already been submitted by '${playerId}'.`,
      );
    } else if (!stageAllowed) {
      validation = makeValidationError(
        "action-unavailable",
        `Interaction '${interactionId}' is not allowed in the current stage.`,
      );
    } else if (!stepAllowed) {
      validation = makeValidationError(
        "action-unavailable",
        `Interaction '${interactionId}' is not allowed in the current step.`,
      );
    }

    const canEvaluateProjectionDetails =
      mode !== "submit" && visible && authorized && stageAllowed && stepAllowed;
    const canContinueSubmitValidation = mode === "submit" && validation.valid;
    let cost: Record<string, number> | undefined;
    let missingResources: Record<string, number> | undefined;
    let costAffordable = true;
    if (canContinueSubmitValidation || canEvaluateProjectionDetails) {
      const costDecision = evaluateInteractionCost(
        state,
        interaction,
        playerId,
        parsed.params,
        projection,
      );
      if ("error" in costDecision) {
        costAffordable = false;
        validation = makeValidationError(
          "cost-unavailable",
          `Interaction '${interactionId}' cost could not be evaluated.`,
        );
      } else {
        cost = costDecision.cost ?? undefined;
        missingResources = costDecision.missing ?? undefined;
        costAffordable =
          !missingResources ||
          Object.values(missingResources).every((amount) => amount <= 0);
        if (!costAffordable) {
          if (mode === "submit" || validation.valid) {
            validation = makeValidationError(
              "INSUFFICIENT_RESOURCES",
              `Interaction '${interactionId}' cannot be afforded.`,
            );
          }
        }
      }
    }

    let ruleAvailabilityIssue: InteractionRuleIssue | undefined;
    if (
      (canContinueSubmitValidation || canEvaluateProjectionDetails) &&
      interaction.rules
    ) {
      const availabilityArgs = scope.buildRuntimeArgs(
        state,
        {
          state: projection?.domainState ?? scope.toDomainState(state),
          input: { playerId },
        },
        projection,
      );
      for (const rule of interaction.rules) {
        if (!rule.available) continue;
        if (!rule.available(availabilityArgs)) {
          ruleAvailabilityIssue = issueFromRule(rule);
          if (mode === "submit" || validation.valid) {
            validation = makeValidationError(
              ruleAvailabilityIssue.errorCode,
              ruleAvailabilityIssue.message,
            );
          }
          break;
        }
      }
    }

    let authoredValidation:
      | {
          errorCode: string;
          message?: string;
        }
      | undefined;
    if (
      (validation.valid || (mode === "card" && canEvaluateProjectionDetails)) &&
      (mode === "submit" || mode === "card")
    ) {
      if (validation.valid && mode === "submit") {
        validation = validateCollectorTargets(
          interaction,
          projection?.domainState ?? scope.toDomainState(state),
          playerId,
          parsed.params,
        );
      }
    }

    if (
      (validation.valid || (mode === "card" && canEvaluateProjectionDetails)) &&
      (mode === "submit" || mode === "card")
    ) {
      const validateArgs = scope.buildRuntimeArgs(
        state,
        {
          state: projection?.domainState ?? scope.toDomainState(state),
          input: {
            playerId,
            params: parsed.params,
          },
        },
        projection,
      );
      for (const rule of interaction.rules ?? []) {
        if (!rule.validate) continue;
        authoredValidation = issueFromRuleValidationResult(
          rule,
          rule.validate(validateArgs),
        );
        if (authoredValidation) break;
      }
      if (authoredValidation) {
        if (mode === "submit" || validation.valid) {
          validation = makeValidationError(
            authoredValidation.errorCode,
            authoredValidation.message,
          );
        }
      }
    }

    const available =
      stageAllowed &&
      stepAllowed &&
      authorized &&
      !ruleAvailabilityIssue &&
      costAffordable &&
      !authoredValidation;
    const unavailableReason = available
      ? undefined
      : !authorized
        ? "Not your turn"
        : !stageAllowed
          ? "Interaction not allowed in current stage"
          : !stepAllowed
            ? "Interaction not allowed in current step"
            : ruleAvailabilityIssue
              ? (ruleAvailabilityIssue.message ??
                ruleAvailabilityIssue.errorCode)
              : !costAffordable
                ? "INSUFFICIENT_RESOURCES"
                : mode === "card"
                  ? (authoredValidation?.message ?? "Interaction unavailable")
                  : "Interaction unavailable";
    const descriptor = buildBaseDescriptor(
      state,
      playerId,
      trustedInteractionId,
      interaction,
      {
        available,
        unavailableReason,
        cost,
        missingResources,
      },
      {
        projection,
        includeEligibleTargets: available || mode === "card",
      },
    );
    return {
      found: true,
      interaction,
      parsedParams: parsed.params,
      visible,
      descriptor,
      validation,
    };
  }

  function resolveAvailableInteractionsFor(
    state: State,
    playerId: PlayerId,
    options: { projection?: ProjectionContext<DomainState, State> } = {},
  ) {
    const phaseName = state.flow.currentPhase as PhaseName;
    const descriptors: Descriptor[] = [];
    for (const [interactionId] of scope.interactionEntriesForPhase(phaseName)) {
      const decision = resolveInteractionDecision({
        state,
        playerId,
        interactionId,
        params: {},
        mode: "descriptor",
        projection: options.projection,
      });
      if (!decision.found || !decision.visible) continue;
      descriptors.push(decision.descriptor);
    }
    return descriptors;
  }

  return {
    evaluateInteractionCost,
    resolveAvailableInteractionsFor,
    resolveInteractionDecision,
  };
}
