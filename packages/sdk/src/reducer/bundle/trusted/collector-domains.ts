import { createDerivedResolver, type DerivedResolver } from "../../derived";
import { createStateQueries } from "../../table-queries";
import type {
  AnyInteractionSpec,
  BoardTargetDomainDescriptor,
  CardTargetDomainDescriptor,
  CollectorState,
  InputCollector,
  InputDomainDescriptor,
  ManifestContract,
  TableOfState,
  TableQueriesOfState,
} from "../../model";
import type { InteractionInputDescriptorShape } from "./interaction-types";
import {
  collectTargetDomainMetadata,
  interactionInputsOf,
} from "./collector-introspection";
import {
  collectEligibleTargets,
  type CollectorProjectionOptions,
} from "./collector-eligibility";

const MAX_EAGER_DEPENDENT_DOMAIN_CASES = 64;

function withSelection(
  domain: InputDomainDescriptor,
  collector: InputCollector,
): InputDomainDescriptor {
  if (!collector.selection) return domain;
  return { ...domain, selection: collector.selection };
}

function lazyTargetDomainFromCollectorMetadata(
  key: string,
  collector: InputCollector,
  dependencies: readonly string[],
): CardTargetDomainDescriptor | BoardTargetDomainDescriptor | null {
  const metadata = collectTargetDomainMetadata(collector);
  if (collector.kind === "card") {
    return withSelection(
      {
        type: "cardTarget",
        projection: "lazy",
        targetKind: "card",
        zoneIds:
          metadata.zoneIds ??
          (metadata.zoneId === undefined ? [] : [metadata.zoneId]),
        dependencies: {
          mode: "lazy",
          dependsOn: dependencies,
          resolver: { inputKey: key },
        },
      },
      collector,
    ) as CardTargetDomainDescriptor;
  }
  if (
    collector.kind === "board-edge" ||
    collector.kind === "board-space" ||
    collector.kind === "board-tile" ||
    collector.kind === "board-vertex"
  ) {
    return withSelection(
      {
        type: "boardTarget",
        projection: "lazy",
        targetKind: (metadata.targetKind ??
          collector.kind.replace("board-", "")) as
          | "edge"
          | "vertex"
          | "space"
          | "tile",
        boardId: metadata.boardId ?? "",
        ...(metadata.valueKind ? { valueKind: metadata.valueKind } : {}),
        dependencies: {
          mode: "lazy",
          dependsOn: dependencies,
          resolver: { inputKey: key },
        },
      },
      collector,
    ) as BoardTargetDomainDescriptor;
  }
  return null;
}

function finiteValuesForDependency(
  key: string,
  domain: InputDomainDescriptor | undefined,
): string[] {
  if (!domain) {
    throw new Error(
      `Interaction input '${key}' is declared as a dependency before it has a projected domain.`,
    );
  }
  if (domain.type === "cardTarget" || domain.type === "boardTarget") {
    if (domain.projection !== "resolved") {
      throw new Error(
        `Interaction input '${key}' cannot be used as a dependency because its target domain is not finite.`,
      );
    }
    return [...domain.eligibleTargets];
  }
  if (domain.type === "choice") {
    return domain.choices.flatMap((choice) =>
      choice.value === null ? [] : [choice.value],
    );
  }
  throw new Error(
    `Interaction input '${key}' cannot be used as a dependency. V1 supports finite target and choice dependencies only.`,
  );
}

function cartesianDependencyTuples(
  dependencies: readonly string[],
  domainsByKey: Record<string, InputDomainDescriptor>,
): Array<Record<string, string>> {
  return dependencies.reduce<Array<Record<string, string>>>(
    (tuples, key) => {
      const values = finiteValuesForDependency(key, domainsByKey[key]);
      return tuples.flatMap((tuple) =>
        values.map((value) => ({ ...tuple, [key]: value })),
      );
    },
    [{}],
  );
}

function withoutDependentProjection(
  domain: InputDomainDescriptor,
): InputDomainDescriptor {
  const { dependencies: _dependencies, ...rest } =
    domain as InputDomainDescriptor & { dependencies?: unknown };
  return rest as InputDomainDescriptor;
}

function toLazyTargetDomain(
  key: string,
  domain: InputDomainDescriptor,
  dependencies: readonly string[],
): CardTargetDomainDescriptor | BoardTargetDomainDescriptor | null {
  if (domain.type === "cardTarget") {
    return {
      type: "cardTarget",
      projection: "lazy",
      targetKind: "card",
      zoneIds: domain.zoneIds,
      ...(domain.selection ? { selection: domain.selection } : {}),
      dependencies: {
        mode: "lazy",
        dependsOn: dependencies,
        resolver: { inputKey: key },
      },
    };
  }
  if (domain.type === "boardTarget") {
    return {
      type: "boardTarget",
      projection: "lazy",
      targetKind: domain.targetKind,
      boardId: domain.boardId,
      ...(domain.valueKind ? { valueKind: domain.valueKind } : {}),
      ...(domain.selection ? { selection: domain.selection } : {}),
      dependencies: {
        mode: "lazy",
        dependsOn: dependencies,
        resolver: { inputKey: key },
      },
    };
  }
  return null;
}

function dependencyCaseCount(
  dependencies: readonly string[],
  domainsByKey: Record<string, InputDomainDescriptor>,
): number {
  return dependencies
    .map((key) => finiteValuesForDependency(key, domainsByKey[key]).length)
    .reduce((total, count) => total * count, 1);
}

function unsupportedDefaultInputError(key: string, collector: InputCollector) {
  return new Error(
    `Interaction input '${key}' uses a '${collector.kind}' collector without a default-renderable domain or target metadata. ` +
      "Use formInput.choice(...), formInput.choiceList(...), formInput.number(...), formInput.resourceMap(...), cardInput(...), or boardInput(...). " +
      "For custom payloads, use a custom interaction surface with paramsSchema instead of the default InteractionForm.",
  );
}

export function collectInputDomains<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
  PlayerId extends string,
>(
  interaction: AnyInteractionSpec<DomainState, Manifest>,
  domainState: DomainState,
  playerId: PlayerId,
  eligibleTargets: Record<string, string[]>,
  options: CollectorProjectionOptions<DomainState> = {},
): Record<string, InputDomainDescriptor> {
  const collectors = interactionInputsOf(interaction);
  let queriesLazy: TableQueriesOfState<DomainState> | null =
    options.queries ?? null;
  const queries = () =>
    (queriesLazy ??= createStateQueries(
      domainState as unknown as { table: CollectorState["table"] },
    ) as unknown as TableQueriesOfState<DomainState>);
  let derivedLazy: DerivedResolver | null = options.derived ?? null;
  const derived = () =>
    (derivedLazy ??= createDerivedResolver(domainState, { q: queries() }));
  const result: Record<string, InputDomainDescriptor> = {};
  for (const [key, collector] of Object.entries(collectors)) {
    if (collector.kind === "rng") {
      continue;
    }
    if (collector.kind === "prompt") {
      const optionFactory = collector.meta?.options;
      if (!optionFactory) continue;
      result[key] = {
        type: "choice",
        choices: optionFactory(domainState, playerId, queries() as unknown).map(
          (option) => ({
            value: String(option.id),
            label: option.label ?? String(option.id),
            ...(() => {
              const issue = collector.validateTarget?.(
                domainState,
                playerId,
                queries() as unknown,
                String(option.id),
              );
              return issue
                ? {
                    disabled: true,
                    disabledReason: issue.message ?? issue.errorCode,
                  }
                : {};
            })(),
          }),
        ),
      };
      continue;
    }
    if (collector.domain) {
      const domainProjector = collector.domain;
      const dependencies = collector.dependsOn ?? [];
      if (
        options.includeEligibleTargets === false &&
        !Object.prototype.hasOwnProperty.call(eligibleTargets, key)
      ) {
        const lazyDomain = lazyTargetDomainFromCollectorMetadata(
          key,
          collector,
          dependencies,
        );
        if (lazyDomain) {
          result[key] = lazyDomain;
          continue;
        }
      }
      const baseDomain = withSelection(
        domainProjector(
          domainState,
          playerId as string,
          queries() as unknown,
          derived(),
          {},
        ),
        collector,
      );
      if (dependencies.length === 0) {
        result[key] = baseDomain;
        continue;
      }
      const caseCount = dependencyCaseCount(dependencies, result);
      const lazyDomain =
        caseCount > MAX_EAGER_DEPENDENT_DOMAIN_CASES
          ? toLazyTargetDomain(key, baseDomain, dependencies)
          : null;
      if (lazyDomain) {
        result[key] = lazyDomain;
        continue;
      }
      const dependentCases = cartesianDependencyTuples(
        dependencies,
        result,
      ).map((values) => ({
        when: values,
        domain: withoutDependentProjection(
          withSelection(
            domainProjector(
              domainState,
              playerId as string,
              queries() as unknown,
              derived(),
              values,
            ),
            collector,
          ),
        ),
      }));
      result[key] = {
        ...baseDomain,
        dependencies: {
          mode: "eager",
          dependentCases,
        },
      } as InputDomainDescriptor;
      continue;
    }
    throw unsupportedDefaultInputError(key, collector);
  }
  return result;
}

export function collectInteractionInputs<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
  PlayerId extends string,
>(
  interaction: AnyInteractionSpec<DomainState, Manifest>,
  domainState: DomainState,
  playerId: PlayerId,
  options: CollectorProjectionOptions<DomainState> = {},
): InteractionInputDescriptorShape[] {
  const collectors = interactionInputsOf(interaction);
  const dependencyKeys = new Set(
    Object.values(collectors).flatMap((collector) => [
      ...(collector.dependsOn ?? []),
    ]),
  );
  const collectedEligibleTargets =
    options.includeEligibleTargets === false && dependencyKeys.size === 0
      ? {}
      : collectEligibleTargets(interaction, domainState, playerId, options);
  const eligibleTargets =
    options.includeEligibleTargets === false
      ? Object.fromEntries(
          Object.entries(collectedEligibleTargets).filter(([key]) =>
            dependencyKeys.has(key),
          ),
        )
      : collectedEligibleTargets;
  const domainsByKey = collectInputDomains(
    interaction,
    domainState,
    playerId,
    eligibleTargets,
    options,
  );
  let queriesLazy: TableQueriesOfState<DomainState> | null =
    options.queries ?? null;
  const queries = () =>
    (queriesLazy ??= createStateQueries(
      domainState as unknown as { table: CollectorState["table"] },
    ) as unknown as TableQueriesOfState<DomainState>);
  let derivedLazy: DerivedResolver | null = options.derived ?? null;
  const derived = () =>
    (derivedLazy ??= createDerivedResolver(domainState, { q: queries() }));
  return Object.entries(collectors).flatMap(([key, collector]) => {
    if (collector.kind === "rng") {
      return [];
    }
    const domain = domainsByKey[key];
    if (!domain && collector.kind === "prompt") {
      return [];
    }
    if (!domain) {
      throw unsupportedDefaultInputError(key, collector);
    }
    const dynamicDefault = collector.resolveDefaultValue?.(
      domainState,
      playerId as string,
      queries() as unknown,
      derived(),
      domain,
    );
    const defaultValue =
      "defaultValue" in collector ? collector.defaultValue : dynamicDefault;
    warnConcreteDependentChoiceDefault({
      inputKey: key,
      collector,
      domain,
      defaultValue,
      dependencyKeys,
    });
    return [
      {
        key,
        kind: collector.kind,
        domain,
        ...(defaultValue !== undefined ? { defaultValue } : {}),
      },
    ];
  });
}

const concreteDependentChoiceDefaultWarnings = new Set<string>();

function shouldEmitAuthoringWarning(): boolean {
  const env = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;
  return (
    env?.NODE_ENV !== "production" &&
    env?.DREAMBOARD_SUPPRESS_AUTHORING_WARNINGS !== "1"
  );
}

function warnConcreteDependentChoiceDefault({
  inputKey,
  collector,
  domain,
  defaultValue,
  dependencyKeys,
}: {
  inputKey: string;
  collector: InputCollector;
  domain: InputDomainDescriptor;
  defaultValue: unknown;
  dependencyKeys: ReadonlySet<string>;
}): void {
  if (
    !shouldEmitAuthoringWarning() ||
    !dependencyKeys.has(inputKey) ||
    collector.kind !== "form" ||
    domain.type !== "choice" ||
    defaultValue === undefined ||
    defaultValue === null
  ) {
    return;
  }

  const warningKey = `${inputKey}:${String(defaultValue)}`;
  if (concreteDependentChoiceDefaultWarnings.has(warningKey)) {
    return;
  }
  concreteDependentChoiceDefaultWarnings.add(warningKey);
  console.warn(
    `[dreamboard] Form choice input "${inputKey}" feeds another collector and defaulted to "${String(
      defaultValue,
    )}". Dependent choices that select the object an action applies to should usually use defaultValue: () => undefined so collection stays explicit.`,
  );
}

export function collectPromptOptions(
  interaction: {
    inputs: Record<string, InputCollector>;
  },
  domainState: unknown,
  playerId: string,
  queries: unknown,
): Array<{ id: string; label?: string }> | undefined {
  for (const collector of Object.values(interaction.inputs)) {
    if (collector.kind !== "prompt") continue;
    const factory = collector.meta?.options;
    if (!factory) continue;
    return factory(domainState, playerId, queries).map((option) => ({
      id: String(option.id),
      ...(option.label !== undefined ? { label: option.label } : {}),
    }));
  }
  return undefined;
}
