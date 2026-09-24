import { inputValueInDomain } from "../../../shared/input-domain";
import { formatIssue } from "../../parse-utils";
import { createStateQueries } from "../../table-queries";
import type {
  AnyInteractionSpec,
  CollectorState,
  InputCollector,
  InputSelectionDescriptor,
  ManifestContract,
  ReducerValidationResult,
  TableOfState,
} from "../../model";
import { makeValidationError } from "./interaction-types";
import { interactionInputsOf } from "./collector-introspection";

export function normalizeCollectorValue(
  collector: InputCollector,
  value: unknown,
  playerId?: string,
): unknown {
  return collector.kind === "board-space" &&
    collector.meta?.valueKind === "player-board-space" &&
    typeof value === "string" &&
    playerId
    ? { boardId: collector.meta.boardId, playerId, spaceId: value }
    : value;
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
  if (interaction.paramsSchema) {
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
    const rawValue = normalizeCollectorValue(
      collector,
      rawValueBase,
      options.playerId,
    );
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
    const issue = validateCollectorValue(
      collector,
      domainState,
      playerId,
      queries(),
      params[key],
    );
    if (issue) return makeValidationError(issue.errorCode, issue.message);
  }
  return { valid: true };
}

export function validateCollectorValue(
  collector: InputCollector,
  state: CollectorState,
  playerId: string,
  q: unknown,
  value: unknown,
  domain = collector.domain?.(state, playerId, q),
): { errorCode: string; message?: string } | null {
  const selectionIssue = validateCollectorSelection(collector, value);
  if (selectionIssue) return selectionIssue;
  if (value === undefined || collector.kind === "rng") return null;
  if (value !== null) {
    for (const target of valuesForCollectorValidation(
      collector.selection,
      value,
    )) {
      const issue = collector.validateTarget?.(state, playerId, q, target);
      if (issue) return issue;
    }
  }
  return domain && !inputValueInDomain(domain, value, collector.selection)
    ? {
        errorCode: "INVALID_INPUT_VALUE",
        message: "Selected value is outside the current input domain.",
      }
    : null;
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

export function validateCollectorSelection(
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
