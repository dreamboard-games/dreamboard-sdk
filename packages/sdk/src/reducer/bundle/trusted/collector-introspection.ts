import type {
  AnyInteractionSpec,
  CollectorState,
  InputCollector,
  ManifestContract,
  TableOfState,
} from "../../model";

export function collectTargetDomainMetadata(collector: InputCollector): {
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

export function interactionInputsOf<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
>(
  interaction: AnyInteractionSpec<DomainState, Manifest>,
): Record<string, InputCollector> {
  return interaction.inputs as Record<string, InputCollector>;
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
