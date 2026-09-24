import { createStateQueries } from "../../table-queries";
import type {
  AnyInteractionSpec,
  CollectorState,
  ManifestContract,
  TableOfState,
} from "../../model";
import type { InteractionInputDescriptorShape } from "./interaction-types";
import { interactionInputsOf } from "./collector-introspection";
import type { CollectorProjectionOptions } from "./collector-eligibility";

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
  const q = options.queries ?? createStateQueries(domainState);
  return Object.entries(interactionInputsOf(interaction)).flatMap(
    ([key, collector]) => {
      if (collector.kind === "rng") return [];
      if (!collector.domain)
        throw new Error(`Interaction input '${key}' has no renderable domain.`);
      const resolved = collector.domain(domainState, playerId, q);
      const domain = collector.selection
        ? { ...resolved, selection: collector.selection }
        : resolved;
      const defaultValue =
        "defaultValue" in collector
          ? collector.defaultValue
          : collector.resolveDefaultValue?.(domainState, playerId, q, domain);
      return [
        {
          key,
          kind: collector.kind,
          domain,
          ...(defaultValue !== undefined ? { defaultValue } : {}),
        },
      ];
    },
  );
}
