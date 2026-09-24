import type { StepDefinition } from "../../authoring/steps";
import type {
  CollectorState,
  InputCollector,
  InputDomainDescriptor,
  PlayerIdOfState,
  TableQueriesOfState,
} from "../../model";
import { createStateQueries } from "../../table-queries";
import {
  normalizeCollectorValue,
  validateCollectorValue,
} from "./collector-params";

/** Evaluate in order against authoritative state. Never samples RNG or applies defaults. */
export function evaluateStepPrefix<State extends CollectorState>(
  steps: StepDefinition<Record<string, InputCollector>>,
  state: State,
  playerId: PlayerIdOfState<State>,
  values: readonly unknown[],
) {
  const q = createStateQueries(state) as TableQueriesOfState<State>;
  const selected: Record<string, unknown> = {};
  const collectors: Record<string, InputCollector> = {};
  const validValues: unknown[] = [];
  let current:
    | { key: string; collector: InputCollector; domain?: InputDomainDescriptor }
    | undefined;
  let issue: string | undefined;
  for (const entry of steps.entries) {
    const collector = entry.resolve({ state, playerId, q, selected });
    const domain = collector.domain?.(state, playerId, q);
    current = { key: entry.key, collector, domain };
    if (validValues.length === values.length) break;
    const value = values[validValues.length];
    const parsed = collector.schema.safeParse(
      normalizeCollectorValue(collector, value, playerId),
    );
    if (!parsed.success || value === undefined || parsed.data === undefined) {
      issue = `Invalid value for step '${entry.key}'.`;
      break;
    }
    if (
      validateCollectorValue(collector, state, playerId, q, parsed.data, domain)
    ) {
      issue = `Value for step '${entry.key}' is no longer eligible.`;
      break;
    }
    selected[entry.key] = parsed.data;
    collectors[entry.key] = collector;
    validValues.push(value);
    current = undefined;
  }
  if (values.length > steps.entries.length)
    issue = "Too many committed step values.";
  return {
    selected,
    collectors,
    values: validValues,
    current,
    issue,
    complete: !current && validValues.length === steps.entries.length,
  };
}
