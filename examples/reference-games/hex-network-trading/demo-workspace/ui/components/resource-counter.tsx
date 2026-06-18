import { ResourceCounter } from "#dreamboard/ui-contract";
import { literals, type ResourceId } from "../../shared/manifest-contract";
import {
  RESOURCE_CHIP_CLASS,
  RESOURCE_CHIP_COMPACT_CLASS,
  RESOURCE_COUNTER_CLASS,
  RESOURCE_ICON_CLASS,
  RESOURCE_ICON_COMPACT_CLASS,
} from "../styles";

export function resourceCounts(
  counts: Partial<Record<ResourceId, number>>,
): Record<ResourceId, number> {
  return Object.fromEntries(
    literals.resourceIds.map((resource) => [resource, counts[resource] ?? 0]),
  ) as Record<ResourceId, number>;
}

export function FrontierResourceCounter({
  counts,
  showZero = true,
  compact = false,
}: {
  counts: Record<ResourceId, number>;
  showZero?: boolean;
  compact?: boolean;
}) {
  return (
    <ResourceCounter.Root
      counts={counts}
      zero={showZero ? "show" : "hide"}
      className={RESOURCE_COUNTER_CLASS}
    >
      <ResourceCounter.Item
        className={compact ? RESOURCE_CHIP_COMPACT_CLASS : RESOURCE_CHIP_CLASS}
      >
        <ResourceCounter.Icon
          className={
            compact ? RESOURCE_ICON_COMPACT_CLASS : RESOURCE_ICON_CLASS
          }
        />
        <ResourceCounter.Count className="tabular-nums" />
      </ResourceCounter.Item>
    </ResourceCounter.Root>
  );
}
