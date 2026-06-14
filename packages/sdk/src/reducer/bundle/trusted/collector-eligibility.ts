import type { DerivedResolver } from "../../derived";
import { createStateQueries } from "../../table-queries";
import type {
  AnyInteractionSpec,
  CollectorState,
  ManifestContract,
  TableOfState,
  TableQueriesOfState,
} from "../../model";
import type { ReducerDiagnosticsSink } from "../../diagnostics";
import { interactionInputsOf } from "./collector-introspection";

export type CollectorProjectionOptions<DomainState extends CollectorState> = {
  readonly queries?: TableQueriesOfState<DomainState>;
  readonly derived?: DerivedResolver;
  readonly eligibleTargetCache?: Map<string, string[]>;
  readonly eligibleTargetCachePrefix?: string;
  readonly includeEligibleTargets?: boolean;
  readonly diagnostics?: ReducerDiagnosticsSink;
};

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
