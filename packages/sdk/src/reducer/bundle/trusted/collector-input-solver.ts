import { createDerivedResolver, type DerivedResolver } from "../../derived";
import { createStateQueries } from "../../table-queries";
import type {
  AnyInteractionSpec,
  CollectorState,
  InputCollector,
  InputDomainDescriptor,
  ManifestContract,
  TableOfState,
  TableQueriesOfState,
} from "../../model";
import { interactionInputsOf } from "./collector-introspection";

export type CollectorInputSatisfiability =
  | { readonly status: "yes" }
  | { readonly status: "no"; readonly inputKey?: string }
  | { readonly status: "notEnumerable"; readonly inputKey?: string };

export type CollectorInputEnumeration =
  | {
      readonly status: "enumerated";
      readonly assignments: readonly Readonly<Record<string, unknown>>[];
      readonly evaluated: number;
    }
  | {
      readonly status: "notEnumerable";
      readonly assignments: readonly [];
      readonly evaluated: number;
      readonly inputKey?: string;
    }
  | {
      readonly status: "budget";
      readonly assignments: readonly [];
      readonly evaluated: number;
      readonly inputKey?: string;
    };

export type CollectorInputSolverOptions<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
  PlayerId extends string,
> = {
  readonly interaction: AnyInteractionSpec<DomainState, Manifest>;
  readonly domainState: DomainState;
  readonly playerId: PlayerId;
  readonly queries?: TableQueriesOfState<DomainState>;
  readonly derived?: DerivedResolver;
  /** Values already selected by a trusted caller, such as a card projection. */
  readonly initialValues?: Readonly<Record<string, unknown>>;
  /**
   * Final trusted acceptance check for one structurally complete assignment.
   * The decision layer supplies the normal submit validator here so collector
   * domains cannot advertise commands rejected by rules, costs, or targets.
   */
  readonly acceptsAssignment?: (
    assignment: Readonly<Record<string, unknown>>,
  ) => boolean;
};

type ValueSource = {
  /** False means the yielded values are witnesses, not an exhaustive domain. */
  readonly complete: boolean;
  readonly values: () => Iterable<unknown>;
};

type SolverContext = {
  readonly interaction: AnyInteractionSpec<
    CollectorState,
    ManifestContract<CollectorState["table"]>
  >;
  readonly domainState: CollectorState;
  readonly playerId: string;
  readonly collectors: readonly (readonly [string, InputCollector])[];
  readonly initialValues: Readonly<Record<string, unknown>>;
  readonly acceptsAssignment: (
    assignment: Readonly<Record<string, unknown>>,
  ) => boolean;
  readonly queries: () => unknown;
  readonly derived: () => DerivedResolver;
};

type RecursiveSatisfiability =
  | {
      readonly status: "yes";
      readonly assignment: Readonly<Record<string, unknown>>;
    }
  | { readonly status: "no"; readonly inputKey?: string }
  | { readonly status: "notEnumerable"; readonly inputKey?: string };

class EnumerationBudgetError extends Error {
  readonly inputKey?: string;

  constructor(inputKey?: string) {
    super("Collector input enumeration exceeded its evaluation budget.");
    this.name = "EnumerationBudgetError";
    this.inputKey = inputKey;
  }
}

class DomainNotEnumerableError extends Error {
  readonly inputKey?: string;

  constructor(inputKey?: string) {
    super("Collector input domain is not completely enumerable.");
    this.name = "DomainNotEnumerableError";
    this.inputKey = inputKey;
  }
}

/**
 * Proves whether collector/domain authority contains at least one complete
 * client parameter assignment. This operation has no pagination or evaluation
 * budget: changing an explore page can never change production actionability.
 */
export function hasAnyCollectorInputAssignment<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
  PlayerId extends string,
>(
  options: CollectorInputSolverOptions<DomainState, Manifest, PlayerId>,
): CollectorInputSatisfiability {
  const context = createSolverContext(options);
  const result = findFirstAssignment(context, 0, {});
  return result.status === "yes" ? { status: "yes" } : result;
}

/**
 * Materializes the complete finite collector domain in deterministic order.
 * Results are all-or-nothing: an opaque/unbounded branch or exhausted budget
 * returns an omission status instead of a misleading partial domain.
 */
export function enumerateCollectorInputAssignments<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
  PlayerId extends string,
>(
  options: CollectorInputSolverOptions<DomainState, Manifest, PlayerId> & {
    readonly maxEvaluations: number;
  },
): CollectorInputEnumeration {
  assertEvaluationBudget(options.maxEvaluations);
  const context = createSolverContext(options);
  const assignments: Array<Readonly<Record<string, unknown>>> = [];
  let evaluated = 0;

  const accountEvaluation = (inputKey?: string): void => {
    if (evaluated >= options.maxEvaluations) {
      throw new EnumerationBudgetError(inputKey);
    }
    evaluated += 1;
  };

  const visit = (
    collectorIndex: number,
    assignment: Readonly<Record<string, unknown>>,
  ): void => {
    const entry = context.collectors[collectorIndex];
    if (!entry) {
      accountEvaluation();
      const complete = completeAssignment(context, assignment);
      if (complete.status === "yes") assignments.push(complete.assignment);
      if (complete.status === "notEnumerable") {
        throw new DomainNotEnumerableError(complete.inputKey);
      }
      return;
    }

    const [inputKey, collector] = entry;
    if (collector.kind === "rng") {
      visit(collectorIndex + 1, assignment);
      return;
    }

    const source = valueSourceForCollector(
      context,
      inputKey,
      collector,
      assignment,
    );
    if (!source.complete) {
      throw new DomainNotEnumerableError(inputKey);
    }
    for (const value of source.values()) {
      accountEvaluation(inputKey);
      visit(collectorIndex + 1, { ...assignment, [inputKey]: value });
    }
  };

  try {
    visit(0, {});
  } catch (error) {
    if (error instanceof DomainNotEnumerableError) {
      return {
        status: "notEnumerable",
        assignments: [],
        evaluated,
        inputKey: error.inputKey,
      };
    }
    if (error instanceof EnumerationBudgetError) {
      return {
        status: "budget",
        assignments: [],
        evaluated,
        inputKey: error.inputKey,
      };
    }
    throw error;
  }

  const byCanonicalValue = new Map<string, Readonly<Record<string, unknown>>>();
  for (const assignment of assignments) {
    byCanonicalValue.set(canonicalJson(assignment), assignment);
  }
  return {
    status: "enumerated",
    assignments: [...byCanonicalValue.entries()]
      .sort(([left], [right]) => compareCanonicalStrings(left, right))
      .map(([, assignment]) => assignment),
    evaluated,
  };
}

function createSolverContext<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
  PlayerId extends string,
>(
  options: CollectorInputSolverOptions<DomainState, Manifest, PlayerId>,
): SolverContext {
  let queriesLazy: TableQueriesOfState<DomainState> | null =
    options.queries ?? null;
  const queries = () =>
    (queriesLazy ??= createStateQueries(
      options.domainState as unknown as {
        table: CollectorState["table"];
      },
    ) as unknown as TableQueriesOfState<DomainState>);
  let derivedLazy = options.derived ?? null;
  const derived = () =>
    (derivedLazy ??= createDerivedResolver(options.domainState, {
      q: queries(),
    }));
  return {
    interaction: options.interaction as unknown as AnyInteractionSpec<
      CollectorState,
      ManifestContract<CollectorState["table"]>
    >,
    domainState: options.domainState,
    playerId: options.playerId,
    collectors: Object.entries(interactionInputsOf(options.interaction)),
    initialValues: options.initialValues ?? {},
    acceptsAssignment: options.acceptsAssignment ?? (() => true),
    queries,
    derived,
  };
}

function findFirstAssignment(
  context: SolverContext,
  collectorIndex: number,
  assignment: Readonly<Record<string, unknown>>,
): RecursiveSatisfiability {
  const entry = context.collectors[collectorIndex];
  if (!entry) return completeAssignment(context, assignment);

  const [inputKey, collector] = entry;
  if (collector.kind === "rng") {
    return findFirstAssignment(context, collectorIndex + 1, assignment);
  }

  const source = valueSourceForCollector(
    context,
    inputKey,
    collector,
    assignment,
  );
  let sawUnknown = !source.complete;
  for (const value of source.values()) {
    const result = findFirstAssignment(context, collectorIndex + 1, {
      ...assignment,
      [inputKey]: value,
    });
    if (result.status === "yes") return result;
    if (result.status === "notEnumerable") sawUnknown = true;
  }
  return sawUnknown
    ? { status: "notEnumerable", inputKey }
    : { status: "no", inputKey };
}

function completeAssignment(
  context: SolverContext,
  assignment: Readonly<Record<string, unknown>>,
): RecursiveSatisfiability {
  const candidate = { ...context.initialValues, ...assignment };
  if (!context.interaction.paramsSchema) {
    return context.acceptsAssignment(candidate)
      ? { status: "yes", assignment: candidate }
      : { status: "no" };
  }
  const parsed = context.interaction.paramsSchema.safeParse(candidate);
  if (parsed.success) {
    return context.acceptsAssignment(candidate)
      ? { status: "yes", assignment: candidate }
      : { status: "no" };
  }
  if (context.collectors.length === 0) {
    return { status: "notEnumerable" };
  }
  return { status: "no" };
}

function valueSourceForCollector(
  context: SolverContext,
  inputKey: string,
  collector: InputCollector,
  assignment: Readonly<Record<string, unknown>>,
): ValueSource {
  const dependencyValues = Object.fromEntries(
    (collector.dependsOn ?? []).map((dependencyKey) => [
      dependencyKey,
      Object.prototype.hasOwnProperty.call(assignment, dependencyKey)
        ? assignment[dependencyKey]
        : context.initialValues[dependencyKey],
    ]),
  );
  const resolved = resolveCollectorValueSource(
    context,
    collector,
    dependencyValues,
  );
  if (!Object.prototype.hasOwnProperty.call(context.initialValues, inputKey)) {
    return resolved;
  }

  const fixedValue = context.initialValues[inputKey];
  if (!resolved.complete) {
    return fixedCollectorValueSource(
      context,
      collector,
      fixedValue,
      dependencyValues,
    );
  }
  if (collector.selection?.mode === "many" && !Array.isArray(fixedValue)) {
    const matchingSelections = [...resolved.values()].filter(
      (candidate): candidate is readonly unknown[] =>
        Array.isArray(candidate) &&
        candidate.some(
          (selected) => canonicalJson(selected) === canonicalJson(fixedValue),
        ),
    );
    return finiteValueSource(matchingSelections);
  }
  const matches = [...resolved.values()].some(
    (candidate) => canonicalJson(candidate) === canonicalJson(fixedValue),
  );
  return {
    complete: true,
    values: function* () {
      if (matches) yield fixedValue;
    },
  };
}

function fixedCollectorValueSource(
  context: SolverContext,
  collector: InputCollector,
  fixedValue: unknown,
  dependencyValues: Readonly<Record<string, unknown>>,
): ValueSource {
  const schemaResult = collector.schema.safeParse(fixedValue);
  const targetValues =
    collector.selection?.mode === "many" && Array.isArray(fixedValue)
      ? fixedValue
      : [fixedValue];
  const targetValid = targetValues.every(
    (target) =>
      !collector.validateTarget ||
      collector.validateTarget(
        context.domainState,
        context.playerId,
        context.queries(),
        target,
        dependencyValues,
      ) == null,
  );
  return {
    complete: true,
    values: function* () {
      if (schemaResult.success && targetValid) yield fixedValue;
    },
  };
}

function resolveCollectorValueSource(
  context: SolverContext,
  collector: InputCollector,
  dependencyValues: Readonly<Record<string, unknown>>,
): ValueSource {
  if (
    collector.kind === "prompt" &&
    !collector.meta?.options &&
    !collector.eligibleTargets
  ) {
    return incompleteValueSource();
  }
  if (!collector.domain) return incompleteValueSource();

  const domain = collector.domain(
    context.domainState,
    context.playerId,
    context.queries(),
    context.derived(),
    dependencyValues,
  );
  const base = baseValuesForDomain(
    domain,
    collector,
    context,
    dependencyValues,
  );
  return applySelection(base, collector.selection ?? domain.selection);
}

function baseValuesForDomain(
  domain: InputDomainDescriptor,
  collector: InputCollector,
  context: SolverContext,
  dependencyValues: Readonly<Record<string, unknown>>,
): ValueSource {
  switch (domain.type) {
    case "cardTarget":
    case "boardTarget": {
      if (collector.eligibleTargets) {
        return finiteValueSource(
          collector.eligibleTargets(
            context.domainState,
            context.playerId,
            context.queries(),
            dependencyValues,
          ),
        );
      }
      return domain.projection === "resolved"
        ? finiteValueSource(domain.eligibleTargets)
        : incompleteValueSource();
    }
    case "choice": {
      const eligibleTargetKeys = collector.eligibleTargets
        ? new Set(
            collector
              .eligibleTargets(
                context.domainState,
                context.playerId,
                context.queries(),
                dependencyValues,
              )
              .map((value) => canonicalJson(value)),
          )
        : null;
      return finiteValueSource(
        domain.choices.flatMap((choice) =>
          choice.disabled ||
          (eligibleTargetKeys &&
            !eligibleTargetKeys.has(canonicalJson(choice.value)))
            ? []
            : [choice.value],
        ),
      );
    }
    case "choiceList":
      return choiceListValueSource(domain);
    case "boundedNumber":
      return boundedNumberValueSource(domain.min, domain.max, domain.step ?? 1);
    case "resourceMap":
      return resourceMapValueSource(domain.resources);
  }
}

function finiteValueSource(values: Iterable<unknown>): ValueSource {
  const byCanonicalValue = new Map<string, unknown>();
  for (const value of values) {
    byCanonicalValue.set(canonicalJson(value), value);
  }
  const ordered = [...byCanonicalValue.entries()]
    .sort(([left], [right]) => compareCanonicalStrings(left, right))
    .map(([, value]) => value);
  return {
    complete: true,
    values: () => ordered,
  };
}

function incompleteValueSource(values: readonly unknown[] = []): ValueSource {
  return {
    complete: false,
    values: () => values,
  };
}

function boundedNumberValueSource(
  min: number,
  max: number,
  step: number,
): ValueSource {
  if (![min, max, step].every(Number.isFinite) || step <= 0) {
    return incompleteValueSource();
  }
  if (max < min) return finiteValueSource([]);
  const count = Math.floor((max - min) / step) + 1;
  if (!Number.isSafeInteger(count)) {
    return incompleteValueSource([min]);
  }
  return {
    complete: true,
    values: function* () {
      for (let index = 0; index < count; index += 1) {
        yield min + index * step;
      }
    },
  };
}

function resourceMapValueSource(
  resources: readonly {
    readonly resourceId: string;
    readonly min: number;
    readonly max: number;
  }[],
): ValueSource {
  const orderedResources = [...resources].sort((left, right) =>
    compareCanonicalStrings(left.resourceId, right.resourceId),
  );
  if (
    orderedResources.some(
      ({ min, max }) =>
        !Number.isSafeInteger(min) || !Number.isSafeInteger(max),
    )
  ) {
    return incompleteValueSource();
  }
  if (orderedResources.some(({ min, max }) => max < min)) {
    return finiteValueSource([]);
  }
  return {
    complete: true,
    values: function* () {
      yield* enumerateResourceMaps(orderedResources, 0, {});
    },
  };
}

function* enumerateResourceMaps(
  resources: readonly {
    readonly resourceId: string;
    readonly min: number;
    readonly max: number;
  }[],
  index: number,
  current: Readonly<Record<string, number>>,
): Iterable<Record<string, number>> {
  const resource = resources[index];
  if (!resource) {
    yield { ...current };
    return;
  }
  for (let value = resource.min; value <= resource.max; value += 1) {
    yield* enumerateResourceMaps(resources, index + 1, {
      ...current,
      [resource.resourceId]: value,
    });
  }
}

function choiceListValueSource(domain: {
  readonly choices: readonly {
    readonly value: string;
    readonly disabled?: boolean;
  }[];
  readonly min?: number;
  readonly max?: number;
}): ValueSource {
  const choices = [
    ...new Set(
      domain.choices
        .filter((choice) => !choice.disabled)
        .map((choice) => choice.value),
    ),
  ].sort((left, right) =>
    compareCanonicalStrings(canonicalJson(left), canonicalJson(right)),
  );
  const min = domain.min ?? 0;
  const max = domain.max ?? choices.length;
  if (
    !Number.isSafeInteger(min) ||
    !Number.isSafeInteger(max) ||
    min < 0 ||
    max < min
  ) {
    return incompleteValueSource();
  }
  if (min > choices.length) return finiteValueSource([]);
  const cappedMax = Math.min(max, choices.length);
  return {
    complete: true,
    values: function* () {
      for (let count = min; count <= cappedMax; count += 1) {
        yield* enumerateCombinations(choices, count, 0, []);
      }
    },
  };
}

function applySelection(
  source: ValueSource,
  selection:
    | {
        readonly mode: "single";
      }
    | {
        readonly mode: "many";
        readonly min: number;
        readonly max?: number;
        readonly distinct?: boolean;
      }
    | undefined,
): ValueSource {
  if (selection?.mode !== "many") return source;
  if (!source.complete) return incompleteValueSource();
  const min = selection.min;
  const max = selection.max;
  if (!Number.isSafeInteger(min) || min < 0) return incompleteValueSource();
  if (max !== undefined && (!Number.isSafeInteger(max) || max < min)) {
    return incompleteValueSource();
  }
  if (max === undefined && !selection.distinct) {
    return {
      complete: false,
      values: function* () {
        yield* enumerateSequencesFromSource(source.values, min, []);
      },
    };
  }
  return {
    complete: true,
    values: function* () {
      if (selection.distinct && max === undefined) {
        for (let count = min; ; count += 1) {
          let yielded = false;
          for (const combination of enumerateCombinationsFromSource(
            source.values,
            count,
            0,
            [],
          )) {
            yielded = true;
            yield combination;
          }
          if (!yielded) return;
        }
      }
      const finiteMax = max ?? min;
      for (let count = min; count <= finiteMax; count += 1) {
        if (selection.distinct) {
          yield* enumerateCombinationsFromSource(source.values, count, 0, []);
        } else {
          yield* enumerateSequencesFromSource(source.values, count, []);
        }
      }
    },
  };
}

function* enumerateCombinationsFromSource<Value>(
  values: () => Iterable<Value>,
  count: number,
  start: number,
  current: readonly Value[],
): Iterable<Value[]> {
  if (current.length === count) {
    yield [...current];
    return;
  }
  let index = 0;
  for (const value of values()) {
    if (index >= start) {
      yield* enumerateCombinationsFromSource(values, count, index + 1, [
        ...current,
        value,
      ]);
    }
    index += 1;
  }
}

function* enumerateSequencesFromSource<Value>(
  values: () => Iterable<Value>,
  count: number,
  current: readonly Value[],
): Iterable<Value[]> {
  if (current.length === count) {
    yield [...current];
    return;
  }
  for (const value of values()) {
    yield* enumerateSequencesFromSource(values, count, [...current, value]);
  }
}

function* enumerateCombinations<Value>(
  values: readonly Value[],
  count: number,
  start: number,
  current: readonly Value[],
): Iterable<Value[]> {
  if (current.length === count) {
    yield [...current];
    return;
  }
  for (let index = start; index < values.length; index += 1) {
    yield* enumerateCombinations(values, count, index + 1, [
      ...current,
      values[index]!,
    ]);
  }
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalizeJson(value));
}

function canonicalizeJson(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Collector input domain contains a non-finite number.");
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => compareCanonicalStrings(left, right))
        .map(([key, item]) => [key, canonicalizeJson(item)]),
    );
  }
  throw new Error("Collector input domain contains a non-JSON value.");
}

function compareCanonicalStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertEvaluationBudget(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError("maxEvaluations must be a positive safe integer.");
  }
}
