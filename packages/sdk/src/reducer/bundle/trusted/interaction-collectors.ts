import { formatIssue } from "../../parse-utils";
import { createDerivedResolver, type DerivedResolver } from "../../derived";
import { createStateQueries } from "../../table-queries";
import type {
  AnyInteractionSpec,
  BoardTargetDomainDescriptor,
  CardTargetDomainDescriptor,
  CollectorState,
  InputCollector,
  InputDomainDescriptor,
  InputSelectionDescriptor,
  ManifestContract,
  ReducerValidationResult,
  TableQueriesOfState,
  TableOfState,
} from "../../model";
import { makeValidationError } from "./interaction-types";
import type { InteractionInputDescriptorShape } from "./interaction-types";

const MAX_EAGER_DEPENDENT_DOMAIN_CASES = 64;

type CollectorProjectionOptions<DomainState extends CollectorState> = {
  readonly queries?: TableQueriesOfState<DomainState>;
  readonly derived?: DerivedResolver;
  readonly eligibleTargetCache?: Map<string, string[]>;
  readonly eligibleTargetCachePrefix?: string;
  readonly includeEligibleTargets?: boolean;
};

function collectTargetDomainMetadata(collector: InputCollector): {
  targetKind?: string;
  boardId?: string;
  valueKind?: "board-id" | "player-board-space";
  zoneId?: string;
  zoneIds?: readonly string[];
} {
  switch (collector.kind) {
    case "card": {
      const meta = collector.meta ?? {};
      return {
        targetKind: meta.targetKind ?? "card",
        zoneId: meta.zoneId,
        zoneIds:
          meta.zoneIds ??
          (meta.zoneId === undefined ? undefined : [meta.zoneId]),
      };
    }
    case "board-edge":
    case "board-space":
    case "board-tile":
    case "board-vertex": {
      const meta = collector.meta ?? {};
      return {
        targetKind: meta.targetKind ?? collector.kind.replace("board-", ""),
        boardId: meta.boardId,
        valueKind: meta.valueKind,
      };
    }
    default:
      return {};
  }
}

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

export function interactionInputsOf<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
>(
  interaction: AnyInteractionSpec<DomainState, Manifest>,
): Record<string, InputCollector> {
  return interaction.inputs as Record<string, InputCollector>;
}

export function collectEligibleTargets<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
  PlayerId extends string,
>(
  interaction: AnyInteractionSpec<DomainState, Manifest>,
  domainState: DomainState,
  playerId: PlayerId,
  options: CollectorProjectionOptions<DomainState> = {},
): Record<string, string[]> {
  const collectors = interactionInputsOf(interaction);
  const result: Record<string, string[]> = {};
  let queriesLazy: TableQueriesOfState<DomainState> | null =
    options.queries ?? null;
  const queries = () =>
    (queriesLazy ??= createStateQueries(
      domainState as unknown as { table: CollectorState["table"] },
    ) as unknown as TableQueriesOfState<DomainState>);
  for (const [key, collector] of Object.entries(collectors)) {
    if (!collector.eligibleTargets) continue;
    const cacheKey = options.eligibleTargetCachePrefix
      ? `${options.eligibleTargetCachePrefix}:${key}`
      : null;
    const cached = cacheKey
      ? options.eligibleTargetCache?.get(cacheKey)
      : undefined;
    if (cached) {
      result[key] = cached;
      continue;
    }
    const targets = collector.eligibleTargets(
      domainState as unknown as Parameters<
        NonNullable<typeof collector.eligibleTargets>
      >[0],
      playerId as unknown as Parameters<
        NonNullable<typeof collector.eligibleTargets>
      >[1],
      queries() as unknown as Parameters<
        NonNullable<typeof collector.eligibleTargets>
      >[2],
    );
    const resolved = Array.from(targets as ReadonlyArray<unknown>).map((t) =>
      String(t),
    );
    result[key] = resolved;
    if (cacheKey) {
      options.eligibleTargetCache?.set(cacheKey, resolved);
    }
  }
  return result;
}

export function collectInputMetadata<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
>(
  interaction: AnyInteractionSpec<DomainState, Manifest>,
): Record<
  string,
  {
    kind: string;
    targetKind?: string;
    boardId?: string;
    zoneId?: string;
    zoneIds?: readonly string[];
  }
> {
  const collectors = interactionInputsOf(interaction);
  return Object.fromEntries(
    Object.entries(collectors).map(([key, collector]) => [
      key,
      {
        kind: collector.kind,
        ...collectTargetDomainMetadata(collector),
      },
    ]),
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

export function collectFirstCardZoneId<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
>(interaction: AnyInteractionSpec<DomainState, Manifest>): string | undefined {
  const collectors = interactionInputsOf(interaction);
  for (const collector of Object.values(collectors)) {
    if (collector.kind === "card") {
      if (collector.meta.zoneId.length > 0) {
        return collector.meta.zoneId;
      }
    }
  }
  return undefined;
}

export function collectCardZoneIds<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
>(interaction: AnyInteractionSpec<DomainState, Manifest>): readonly string[] {
  const collectors = interactionInputsOf(interaction);
  const zoneIds = new Set<string>();
  for (const collector of Object.values(collectors)) {
    if (collector.kind === "card") {
      for (const zoneId of collector.meta.zoneIds ?? [collector.meta.zoneId]) {
        if (zoneId.length > 0) zoneIds.add(zoneId);
      }
    }
  }
  return [...zoneIds];
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

export function parseInteractionParams<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
>(
  interaction: AnyInteractionSpec<DomainState, Manifest>,
  rawParams: unknown,
  options: { skipRng?: boolean; playerId?: string } = {},
):
  | { ok: true; params: Record<string, unknown> }
  | { ok: false; message: string } {
  const collectors = interactionInputsOf(interaction);
  const record = (rawParams ?? {}) as Record<string, unknown>;
  if (options.skipRng && interaction.paramsSchema) {
    const result = interaction.paramsSchema.safeParse(record);
    if (!result.success) {
      return {
        ok: false,
        message: result.error.issues
          .map((issue) => formatIssue("params", issue))
          .join("; "),
      };
    }
    return { ok: true, params: result.data as Record<string, unknown> };
  }
  const parsed: Record<string, unknown> = {};
  const issues: string[] = [];
  for (const [key, collector] of Object.entries(collectors)) {
    if (collector.kind === "rng" && options.skipRng) continue;
    const rawValueBase =
      record[key] === undefined && "defaultValue" in collector
        ? collector.defaultValue
        : record[key];
    const rawValue =
      collector.kind === "board-space" &&
      collector.meta?.valueKind === "player-board-space" &&
      typeof rawValueBase === "string" &&
      options.playerId
        ? {
            boardId: collector.meta.boardId,
            playerId: options.playerId,
            spaceId: rawValueBase,
          }
        : rawValueBase;
    const result = collector.schema.safeParse(rawValue);
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push(formatIssue(`params.${key}`, issue));
      }
      continue;
    }
    parsed[key] = result.data;
  }
  if (issues.length > 0) {
    return { ok: false, message: issues.join("; ") };
  }
  return { ok: true, params: parsed };
}

export function prepareInteractionProjectionParams<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
>(
  interaction: AnyInteractionSpec<DomainState, Manifest>,
  rawParams: unknown,
): Record<string, unknown> {
  const collectors = interactionInputsOf(interaction);
  const record = (rawParams ?? {}) as Record<string, unknown>;
  const prepared: Record<string, unknown> = { ...record };
  for (const [key, collector] of Object.entries(collectors)) {
    if (collector.kind === "rng") continue;
    if (record[key] !== undefined) {
      const result = collector.schema.safeParse(record[key]);
      if (result.success) {
        prepared[key] = result.data;
      }
      continue;
    }
    if ("defaultValue" in collector) {
      prepared[key] = collector.defaultValue;
      continue;
    }
    const defaultResult = collector.schema.safeParse(undefined);
    if (defaultResult.success) {
      prepared[key] = defaultResult.data;
    }
  }
  return prepared;
}

export function validateCollectorTargets<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
  PlayerId extends string,
>(
  interaction: AnyInteractionSpec<DomainState, Manifest>,
  domainState: DomainState,
  playerId: PlayerId,
  params: Record<string, unknown>,
): ReducerValidationResult {
  const collectors = interactionInputsOf(interaction);
  let queriesLazy: ReturnType<typeof createStateQueries> | null = null;
  const queries = () =>
    (queriesLazy ??= createStateQueries(
      domainState as unknown as { table: CollectorState["table"] },
    ));
  for (const [key, collector] of Object.entries(collectors)) {
    const selectionIssue = validateCollectorSelection(collector, params[key]);
    if (selectionIssue) {
      return makeValidationError(
        selectionIssue.errorCode,
        selectionIssue.message,
      );
    }
    if (!collector.validateTarget) continue;
    const rawTarget = params[key];
    if (rawTarget === null || rawTarget === undefined) continue;
    const dependencyValues = dependencyValuesForCollector(collector, params);
    const targetValues = valuesForCollectorValidation(
      collector.selection,
      rawTarget,
    );
    for (const value of targetValues) {
      const issue = collector.validateTarget(
        domainState as unknown as Parameters<
          typeof collector.validateTarget
        >[0],
        playerId as unknown as Parameters<typeof collector.validateTarget>[1],
        queries() as unknown as Parameters<typeof collector.validateTarget>[2],
        value,
        dependencyValues,
      );
      if (issue) {
        return makeValidationError(issue.errorCode, issue.message);
      }
    }
  }
  return { valid: true };
}

function dependencyValuesForCollector(
  collector: InputCollector,
  params: Record<string, unknown>,
): Readonly<Record<string, unknown>> | undefined {
  const dependencies = collector.dependsOn ?? [];
  if (dependencies.length === 0) return undefined;
  return Object.fromEntries(
    dependencies.map((dependencyKey) => [dependencyKey, params[dependencyKey]]),
  );
}

function valuesForCollectorValidation(
  selection: InputSelectionDescriptor | undefined,
  value: unknown,
): readonly unknown[] {
  if (selection?.mode === "many") {
    return Array.isArray(value) ? value : [];
  }
  return [value];
}

function validateCollectorSelection(
  collector: InputCollector,
  value: unknown,
): { errorCode: string; message?: string } | null {
  const selection = collector.selection;
  if (selection?.mode !== "many") return null;
  if (!Array.isArray(value)) return null;
  if (value.length < selection.min) {
    return {
      errorCode: "INVALID_INPUT_COUNT",
      message: `Input expected at least ${selection.min} value${selection.min === 1 ? "" : "s"}.`,
    };
  }
  if (selection.max !== undefined && value.length > selection.max) {
    return {
      errorCode: "INVALID_INPUT_COUNT",
      message: `Input expected at most ${selection.max} value${selection.max === 1 ? "" : "s"}.`,
    };
  }
  if (selection.distinct) {
    const seen = new Set<string>();
    for (const item of value) {
      const key = stableValueKey(item);
      if (seen.has(key)) {
        return {
          errorCode: "DUPLICATE_INPUT_VALUE",
          message: "Input values must be distinct.",
        };
      }
      seen.add(key);
    }
  }
  return null;
}

function stableValueKey(value: unknown): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
      return `string:${value}`;
    case "number":
    case "boolean":
    case "undefined":
      return `${typeof value}:${String(value)}`;
    default:
      return `json:${JSON.stringify(value)}`;
  }
}

export function findCardInputKey<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
>(interaction: AnyInteractionSpec<DomainState, Manifest>): string | undefined {
  return Object.entries(interactionInputsOf(interaction)).find(
    ([, collector]) => collector.kind === "card",
  )?.[0];
}

export function findCardInputKeyForZone<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
>(
  interaction: AnyInteractionSpec<DomainState, Manifest>,
  zoneId: string,
): string | undefined {
  return Object.entries(interactionInputsOf(interaction)).find(
    ([, collector]) =>
      collector.kind === "card" &&
      (collector.meta.zoneIds ?? [collector.meta.zoneId])
        .map(String)
        .includes(zoneId),
  )?.[0];
}
