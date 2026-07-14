import { createStateQueries } from "../../table-queries";
import type {
  AnyInteractionSpec,
  InputCollector,
  PhaseMapOf,
  ReducerGameContractLike,
  ViewMapOf,
} from "../../model";
import {
  collectCardZoneIds,
  collectFirstCardZoneId,
  interactionInputsOf,
} from "./collector-introspection";
import {
  collectInteractionInputs,
  collectPromptOptions,
} from "./collector-domains";
import type {
  InteractionDecision,
  InteractionAvailabilityShape,
  InteractionDescriptorShape,
  TrustedInteractionDescriptorShape,
  TrustedInteractionId,
} from "./interaction-types";
import { FrameworkErrorCodes } from "../../model";
import type { ProjectionContext } from "./projection-context";
import type {
  TrustedDomainState,
  TrustedManifest,
  TrustedPhaseName,
  TrustedPlayerId,
  TrustedRuntimeScope,
  TrustedState,
} from "./runtime-scope";

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
  presentation?: { label?: string; help?: string };
  interactionId: string;
}): Pick<InteractionDescriptorShape, "kind" | "commit" | "label" | "help"> {
  const label = normalizePresentationText(interaction.presentation?.label);
  const help = normalizePresentationText(interaction.presentation?.help);
  return {
    kind: deriveInteractionKind(interaction.inputs),
    commit: deriveCommitPolicy(interaction.inputs, interaction.commit),
    label: label ?? humanizeInteractionId(interaction.interactionId),
    help,
  };
}

function normalizePresentationText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
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

function interactionAvailabilityFromDecision(
  decision: InteractionDecision,
): InteractionAvailabilityShape {
  if (decision.available) return { status: "available" };
  switch (decision.code) {
    case FrameworkErrorCodes.NOT_YOUR_TURN:
      return {
        status: "notYourTurn",
        reason: decision.message ?? "Not your turn",
      };
    case "INSUFFICIENT_RESOURCES":
      if (decision.missingResources) {
        return {
          status: "insufficientResources",
          reason: decision.message ?? decision.code,
          missingResources: { ...decision.missingResources },
        };
      }
      return {
        status: "blocked",
        reason: decision.message ?? decision.code,
        code: decision.code,
      };
    case FrameworkErrorCodes.NO_LEGAL_INPUT:
      return {
        status: "blocked",
        reason: decision.message ?? "No legal input is currently available.",
        code: FrameworkErrorCodes.NO_LEGAL_INPUT,
      };
    default:
      return {
        status: "blocked",
        reason: decision.message ?? "Interaction unavailable",
        code: decision.code,
      };
  }
}

export function buildInteractionDescriptor<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  scope: TrustedRuntimeScope<Contract, Definitions, Views>,
  state: TrustedState<Contract>,
  playerId: TrustedPlayerId<Contract>,
  interactionId: TrustedInteractionId<Contract, Definitions, Views>,
  interaction: AnyInteractionSpec<
    TrustedDomainState<Contract>,
    TrustedManifest<Contract>
  >,
  decision: InteractionDecision,
  options: {
    projection?: ProjectionContext<
      TrustedDomainState<Contract>,
      TrustedState<Contract>
    >;
    includeEligibleTargets?: boolean;
    includeDiagnosticReasons?: boolean;
  } = {},
): TrustedInteractionDescriptorShape<Contract, Definitions, Views> {
  type PhaseName = TrustedPhaseName<Contract, Definitions, Views>;
  type Descriptor = TrustedInteractionDescriptorShape<
    Contract,
    Definitions,
    Views
  >;
  const domainState =
    options.projection?.domainState ?? scope.toDomainState(state);
  const phaseName = state.flow.currentPhase as PhaseName;
  const interactionInputs = interactionInputsOf(interaction);
  const metadata = projectInteractionMetadata({
    ...interaction,
    inputs: interactionInputs,
    interactionId: String(interactionId),
  });
  const queries = options.projection?.q ?? createStateQueries(domainState);
  const derived = options.projection?.derived;
  const shouldMaterializeInputDomains =
    decision.available || decision.code !== FrameworkErrorCodes.NOT_YOUR_TURN;
  const promptContext =
    metadata.kind === "prompt"
      ? {
          to: playerId,
          title: metadata.label,
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
          diagnostics: scope.diagnostics,
        }),
        scope.definition.contract.manifest,
      )
    : [];
  const baseDescriptor = {
    phaseName,
    interactionKey: `${phaseName}.${interactionId}`,
    interactionId,
    label: metadata.label,
    help: metadata.help,
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
    reasons:
      options.includeDiagnosticReasons && !decision.available && decision.ruleId
        ? [{ ruleId: decision.ruleId, errorCode: decision.code }]
        : undefined,
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
