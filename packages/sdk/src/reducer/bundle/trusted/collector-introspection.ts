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
  boardBaseId?: string;
  boardIds?: readonly string[];
  valueKind?: "board-id" | "board-space";
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
    case "tile":
      return {
        targetKind: "tile",
        zoneIds: collector.meta.zoneIds,
        boardIds: collector.meta.boardIds,
      };
    case "board-edge":
    case "board-space":
    case "board-vertex": {
      const meta = collector.meta ?? {};
      return {
        targetKind: meta.targetKind ?? collector.kind.replace("board-", ""),
        ...(meta.valueKind === "board-space"
          ? { boardBaseId: meta.boardBaseId }
          : { boardId: "boardId" in meta ? meta.boardId : undefined }),
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
  return interaction.inputs ?? {};
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
    boardBaseId?: string;
    boardIds?: readonly string[];
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

/** Declared reference positions; arbitrary game strings are never scanned. */
export function collectTileInputKeys<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
>(interaction: AnyInteractionSpec<DomainState, Manifest>): ReadonlySet<string> {
  return new Set(
    Object.entries(interactionInputsOf(interaction))
      .filter(([, collector]) => collector.kind === "tile")
      .map(([key]) => key),
  );
}

export function collectTileZoneIds<
  DomainState extends CollectorState,
  Manifest extends ManifestContract<TableOfState<DomainState>>,
>(interaction: AnyInteractionSpec<DomainState, Manifest>): readonly string[] {
  return [
    ...new Set(
      Object.values(interactionInputsOf(interaction)).flatMap((collector) =>
        collector.kind === "tile" ? collector.meta.zoneIds : [],
      ),
    ),
  ];
}
