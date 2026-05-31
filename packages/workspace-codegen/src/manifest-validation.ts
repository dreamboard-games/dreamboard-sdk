import type {
  HexBoardSpec,
  HexBoardTemplateSpec,
  HexSpaceSpec,
  HexVertexSpec,
  BoardCard,
  BoardSpec,
  BoardTemplateSpec,
  DieSeedSpec,
  DieTypeSpec,
  GameTopologyManifest,
  PieceSeedSpec,
  PieceTypeSpec,
  SetupOptionSpec,
  ZoneSpec,
} from "@dreamboard-games/sdk-types";
import { resolveHexVertexGeometryKey } from "./hex-geometry.js";

export type ManifestAuthoringValidationResult = {
  errors: string[];
  warnings: string[];
};

function isHexBoardTemplateSpec(
  boardTemplate: BoardTemplateSpec,
): boardTemplate is Extract<BoardTemplateSpec, { layout: "hex" }> {
  return boardTemplate.layout === "hex";
}

function isHexBoardSpec(
  board: BoardSpec,
): board is Extract<BoardSpec, { layout: "hex" }> {
  return board.layout === "hex";
}

function collectDuplicateIdIssues(options: {
  entries: ReadonlyArray<{ id?: string | null; path: string }>;
  label: string;
}): string[] {
  const issues: string[] = [];
  const pathsById = new Map<string, string[]>();

  for (const entry of options.entries) {
    const id = entry.id?.trim();
    if (!id) {
      continue;
    }
    const paths = pathsById.get(id) ?? [];
    paths.push(entry.path);
    pathsById.set(id, paths);
  }

  for (const [id, paths] of pathsById.entries()) {
    if (paths.length > 1) {
      issues.push(`${paths.join(", ")}: Duplicate ${options.label} '${id}'.`);
    }
  }

  return issues;
}

function renderCardInstanceIds(card: BoardCard): string[] {
  return card.count > 1
    ? Array.from(
        { length: card.count },
        (_, index) => `${card.type}-${index + 1}`,
      )
    : [card.type];
}

function expandSeedIds<
  Seed extends {
    id?: string | null;
    typeId: string;
    count?: number | null;
  },
>(seeds: readonly Seed[]): string[] {
  return seeds.flatMap((seed) => {
    const count = seed.count ?? 1;
    const baseId = seed.id ?? seed.typeId;
    return count > 1
      ? Array.from({ length: count }, (_, index) => `${baseId}-${index + 1}`)
      : [baseId];
  });
}

function validateTypeSlotDuplicates(options: {
  pieceTypes: readonly PieceTypeSpec[];
  dieTypes: readonly DieTypeSpec[];
}): string[] {
  const issues: string[] = [];

  for (const [index, pieceType] of options.pieceTypes.entries()) {
    issues.push(
      ...collectDuplicateIdIssues({
        entries: (pieceType.slots ?? []).map((slot, slotIndex) => ({
          id: slot.id,
          path: `manifest.pieceTypes[${index}].slots[${slotIndex}].id`,
        })),
        label: "piece slot id",
      }),
    );
  }

  for (const [index, dieType] of options.dieTypes.entries()) {
    issues.push(
      ...collectDuplicateIdIssues({
        entries: (dieType.slots ?? []).map((slot, slotIndex) => ({
          id: slot.id,
          path: `manifest.dieTypes[${index}].slots[${slotIndex}].id`,
        })),
        label: "die slot id",
      }),
    );
  }

  return issues;
}

function validateSlotHostsAndHomes(manifest: GameTopologyManifest): string[] {
  const issues: string[] = [];
  const pieceTypesById = new Map(
    (manifest.pieceTypes ?? []).map(
      (pieceType) => [pieceType.id, pieceType] as const,
    ),
  );
  const dieTypesById = new Map(
    (manifest.dieTypes ?? []).map((dieType) => [dieType.id, dieType] as const),
  );
  const slotIdsByHostKey = new Map<string, Set<string>>();

  for (const [index, seed] of (manifest.pieceSeeds ?? []).entries()) {
    const pieceType = pieceTypesById.get(seed.typeId);
    const slotIds = (pieceType?.slots ?? []).map((slot) => slot.id);
    if (slotIds.length === 0) {
      continue;
    }
    if (typeof seed.id !== "string" || seed.id.length === 0) {
      issues.push(
        `manifest.pieceSeeds[${index}].id: Piece seed for slot-bearing type '${seed.typeId}' must declare an explicit id.`,
      );
      continue;
    }
    if ((seed.count ?? 1) !== 1) {
      issues.push(
        `manifest.pieceSeeds[${index}].count: Piece seed '${seed.id}' for slot-bearing type '${seed.typeId}' must omit count or set it to 1.`,
      );
      continue;
    }
    slotIdsByHostKey.set(`piece:${seed.id}`, new Set(slotIds));
  }

  for (const [index, seed] of (manifest.dieSeeds ?? []).entries()) {
    const dieType = dieTypesById.get(seed.typeId);
    const slotIds = (dieType?.slots ?? []).map((slot) => slot.id);
    if (slotIds.length === 0) {
      continue;
    }
    if (typeof seed.id !== "string" || seed.id.length === 0) {
      issues.push(
        `manifest.dieSeeds[${index}].id: Die seed for slot-bearing type '${seed.typeId}' must declare an explicit id.`,
      );
      continue;
    }
    if ((seed.count ?? 1) !== 1) {
      issues.push(
        `manifest.dieSeeds[${index}].count: Die seed '${seed.id}' for slot-bearing type '${seed.typeId}' must omit count or set it to 1.`,
      );
      continue;
    }
    slotIdsByHostKey.set(`die:${seed.id}`, new Set(slotIds));
  }

  const validateHome = (
    home: BoardCard["home"] | PieceSeedSpec["home"] | DieSeedSpec["home"],
    path: string,
  ) => {
    if (home?.type !== "slot") {
      return;
    }

    const hostKey = `${home.host.kind}:${home.host.id}`;
    const slotIds = slotIdsByHostKey.get(hostKey);
    if (!slotIds) {
      issues.push(
        `${path}.host: Unknown strict slot host '${home.host.kind}:${home.host.id}'. Hosts must be singleton piece/die seeds whose type declares slots.`,
      );
      return;
    }
    if (!slotIds.has(home.slotId)) {
      issues.push(
        `${path}.slotId: Unknown slot '${home.slotId}' for host '${home.host.kind}:${home.host.id}'.`,
      );
    }
  };

  for (const [cardSetIndex, cardSet] of manifest.cardSets.entries()) {
    if (cardSet.type !== "manual") {
      continue;
    }
    for (const [cardIndex, card] of cardSet.cards.entries()) {
      validateHome(
        card.home,
        `manifest.cardSets[${cardSetIndex}].cards[${cardIndex}].home`,
      );
    }
  }

  for (const [index, seed] of (manifest.pieceSeeds ?? []).entries()) {
    validateHome(seed.home, `manifest.pieceSeeds[${index}].home`);
  }

  for (const [index, seed] of (manifest.dieSeeds ?? []).entries()) {
    validateHome(seed.home, `manifest.dieSeeds[${index}].home`);
  }

  return issues;
}

function validateSetupProfileReferences(
  manifest: GameTopologyManifest,
): string[] {
  const issues: string[] = [];
  const optionChoiceIdsByOptionId = new Map<string, Set<string>>(
    (manifest.setupOptions ?? []).map((option, optionIndex) => {
      const choiceIds = new Set<string>();
      for (const choice of option.choices ?? []) {
        choiceIds.add(choice.id);
      }
      if (!option.id) {
        issues.push(
          `manifest.setupOptions[${optionIndex}].id: Missing option id.`,
        );
      }
      return [option.id, choiceIds];
    }),
  );

  for (const [profileIndex, profile] of (
    manifest.setupProfiles ?? []
  ).entries()) {
    const optionValues = profile.optionValues ?? {};
    for (const [optionId, choiceId] of Object.entries(optionValues)) {
      const allowedChoices = optionChoiceIdsByOptionId.get(optionId);
      if (!allowedChoices) {
        issues.push(
          `manifest.setupProfiles[${profileIndex}].optionValues.${optionId}: Unknown setup option '${optionId}'.`,
        );
        continue;
      }
      if (!allowedChoices.has(choiceId)) {
        issues.push(
          `manifest.setupProfiles[${profileIndex}].optionValues.${optionId}: Unknown choice '${choiceId}' for setup option '${optionId}'.`,
        );
      }
    }
  }

  return issues;
}

function validatePlayerScopedSeedHomes(
  manifest: GameTopologyManifest,
): string[] {
  const issues: string[] = [];
  const boardScopeById = new Map(
    (manifest.boards ?? []).map((board) => [board.id, board.scope] as const),
  );
  const zoneScopeById = new Map(
    (manifest.zones ?? []).map((zone) => [zone.id, zone.scope] as const),
  );

  const validateSeedHome = (
    seed: PieceSeedSpec | DieSeedSpec,
    path: string,
    label: "Piece seed" | "Die seed",
  ) => {
    const authoredId = seed.id ?? seed.typeId;
    if (seed.ownerId) {
      return;
    }

    if (
      homeTargetsBoard(seed.home) &&
      boardScopeById.get(seed.home.boardId) === "perPlayer"
    ) {
      issues.push(
        `${path}.boardId: ${label} '${authoredId}' requires ownerId because board '${seed.home.boardId}' has scope 'perPlayer'. Add ownerId to resolve the player-scoped destination.`,
      );
      return;
    }

    if (
      seed.home?.type === "zone" &&
      zoneScopeById.get(seed.home.zoneId) === "perPlayer"
    ) {
      issues.push(
        `${path}.zoneId: ${label} '${authoredId}' requires ownerId because zone '${seed.home.zoneId}' has scope 'perPlayer'. Add ownerId to resolve the player-scoped destination.`,
      );
    }
  };

  for (const [index, seed] of (manifest.pieceSeeds ?? []).entries()) {
    validateSeedHome(seed, `manifest.pieceSeeds[${index}].home`, "Piece seed");
  }

  for (const [index, seed] of (manifest.dieSeeds ?? []).entries()) {
    validateSeedHome(seed, `manifest.dieSeeds[${index}].home`, "Die seed");
  }

  return issues;
}

function homeTargetsBoard(
  home: PieceSeedSpec["home"] | DieSeedSpec["home"] | undefined,
): home is Extract<
  NonNullable<PieceSeedSpec["home"] | DieSeedSpec["home"]>,
  { type: "space" | "container" | "edge" | "vertex" }
> {
  return (
    home?.type === "space" ||
    home?.type === "container" ||
    home?.type === "edge" ||
    home?.type === "vertex"
  );
}

function validateBoardTemplateDuplicates(
  boardTemplates: readonly BoardTemplateSpec[],
): string[] {
  const issues: string[] = [];

  for (const [index, boardTemplate] of boardTemplates.entries()) {
    if (isHexBoardTemplateSpec(boardTemplate)) {
      issues.push(
        ...collectDuplicateIdIssues({
          entries: (boardTemplate.spaces ?? []).map((space, spaceIndex) => ({
            id: space.id,
            path: `manifest.boardTemplates[${index}].spaces[${spaceIndex}].id`,
          })),
          label: "space id",
        }),
      );
      continue;
    }

    issues.push(
      ...collectDuplicateIdIssues({
        entries: (boardTemplate.spaces ?? []).map((space, spaceIndex) => ({
          id: space.id,
          path: `manifest.boardTemplates[${index}].spaces[${spaceIndex}].id`,
        })),
        label: "space id",
      }),
    );
    issues.push(
      ...collectDuplicateIdIssues({
        entries: (boardTemplate.containers ?? []).map(
          (container, containerIndex) => ({
            id: container.id,
            path: `manifest.boardTemplates[${index}].containers[${containerIndex}].id`,
          }),
        ),
        label: "container id",
      }),
    );
    issues.push(
      ...collectDuplicateIdIssues({
        entries: (boardTemplate.relations ?? []).map(
          (relation, relationIndex) => ({
            id: relation.id,
            path: `manifest.boardTemplates[${index}].relations[${relationIndex}].id`,
          }),
        ),
        label: "relation id",
      }),
    );
  }

  return issues;
}

function validateBoardDuplicates(boards: readonly BoardSpec[]): string[] {
  const issues: string[] = [];

  for (const [index, board] of boards.entries()) {
    if (isHexBoardSpec(board)) {
      issues.push(
        ...collectDuplicateIdIssues({
          entries: (board.spaces ?? []).map((space, spaceIndex) => ({
            id: space.id,
            path: `manifest.boards[${index}].spaces[${spaceIndex}].id`,
          })),
          label: "space id",
        }),
      );
      continue;
    }

    issues.push(
      ...collectDuplicateIdIssues({
        entries: (board.spaces ?? []).map((space, spaceIndex) => ({
          id: space.id,
          path: `manifest.boards[${index}].spaces[${spaceIndex}].id`,
        })),
        label: "space id",
      }),
    );
    issues.push(
      ...collectDuplicateIdIssues({
        entries: (board.containers ?? []).map((container, containerIndex) => ({
          id: container.id,
          path: `manifest.boards[${index}].containers[${containerIndex}].id`,
        })),
        label: "container id",
      }),
    );
    issues.push(
      ...collectDuplicateIdIssues({
        entries: (board.relations ?? []).map((relation, relationIndex) => ({
          id: relation.id,
          path: `manifest.boards[${index}].relations[${relationIndex}].id`,
        })),
        label: "relation id",
      }),
    );
  }

  return issues;
}

function validateSetupOptionChoiceDuplicates(
  options: readonly SetupOptionSpec[],
): string[] {
  const issues: string[] = [];

  for (const [optionIndex, option] of options.entries()) {
    issues.push(
      ...collectDuplicateIdIssues({
        entries: (option.choices ?? []).map((choice, choiceIndex) => ({
          id: choice.id,
          path: `manifest.setupOptions[${optionIndex}].choices[${choiceIndex}].id`,
        })),
        label: "setup option choice id",
      }),
    );
  }

  return issues;
}

function resolveHexSpaces(
  board: HexBoardSpec,
  template: HexBoardTemplateSpec | undefined,
): HexSpaceSpec[] {
  if (!template) {
    return [...(board.spaces ?? [])].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }

  const templateSpacesById = new Map(
    (template.spaces ?? []).map((space) => [space.id, space] as const),
  );
  const overridesById = new Map(
    (board.spaces ?? []).map((space) => [space.id, space] as const),
  );
  for (const overrideId of overridesById.keys()) {
    if (!templateSpacesById.has(overrideId)) {
      continue;
    }
  }

  return (template.spaces ?? [])
    .map((templateSpace) => {
      const override = overridesById.get(templateSpace.id);
      if (!override) {
        return templateSpace;
      }
      return {
        ...templateSpace,
        ...override,
        id: templateSpace.id,
        q: templateSpace.q,
        r: templateSpace.r,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

function validateHexVertexRefs(options: {
  ownerPath: string;
  ownerLabel: string;
  spaces: readonly HexSpaceSpec[];
  vertices: readonly HexVertexSpec[];
}): string[] {
  const issues: string[] = [];
  const spacesById = new Map(
    options.spaces.map((space) => [space.id, space] as const),
  );

  for (const [vertexIndex, vertex] of options.vertices.entries()) {
    try {
      resolveHexVertexGeometryKey(vertex.ref, spacesById);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown hex vertex error.";
      issues.push(
        `${options.ownerPath}.vertices[${vertexIndex}].ref: ${options.ownerLabel} with spaces '${vertex.ref.spaces.join(", ")}' failed validation. ${message}`,
      );
    }
  }

  return issues;
}

function validateHexBoardVertexRefs(manifest: GameTopologyManifest): string[] {
  const issues: string[] = [];
  const hexTemplatesById = new Map(
    (manifest.boardTemplates ?? [])
      .filter(isHexBoardTemplateSpec)
      .map((boardTemplate) => [boardTemplate.id, boardTemplate] as const),
  );

  for (const [templateIndex, template] of (
    manifest.boardTemplates ?? []
  ).entries()) {
    if (!isHexBoardTemplateSpec(template)) {
      continue;
    }
    issues.push(
      ...validateHexVertexRefs({
        ownerPath: `manifest.boardTemplates[${templateIndex}]`,
        ownerLabel: `Hex board template '${template.id}'`,
        spaces: template.spaces ?? [],
        vertices: template.vertices ?? [],
      }),
    );
  }

  for (const [boardIndex, board] of (manifest.boards ?? []).entries()) {
    if (!isHexBoardSpec(board)) {
      continue;
    }
    issues.push(
      ...validateHexVertexRefs({
        ownerPath: `manifest.boards[${boardIndex}]`,
        ownerLabel: `Hex board '${board.id}'`,
        spaces: resolveHexSpaces(
          board,
          hexTemplatesById.get(board.templateId ?? ""),
        ),
        vertices: board.vertices ?? [],
      }),
    );
  }

  return issues;
}

function collectAmbiguousBoardTypeWarnings(
  manifest: GameTopologyManifest,
): string[] {
  const warnings: string[] = [];
  const boardTemplatesById = new Map(
    (manifest.boardTemplates ?? []).map(
      (template) => [template.id, template] as const,
    ),
  );
  const boardsBySpaceType = new Map<string, Set<string>>();
  const boardsByEdgeType = new Map<string, Set<string>>();
  const boardsByVertexType = new Map<string, Set<string>>();

  const addBoardUsage = (
    target: Map<string, Set<string>>,
    typeId: string | null | undefined,
    boardId: string,
  ) => {
    if (!typeId) {
      return;
    }
    const boardIds = target.get(typeId) ?? new Set<string>();
    boardIds.add(boardId);
    target.set(typeId, boardIds);
  };

  for (const board of manifest.boards ?? []) {
    const template = board.templateId
      ? boardTemplatesById.get(board.templateId)
      : undefined;
    for (const space of [
      ...((template?.layout === board.layout ? template.spaces : undefined) ??
        []),
      ...(board.spaces ?? []),
    ]) {
      addBoardUsage(boardsBySpaceType, space.typeId, board.id);
    }

    if (board.layout === "hex" || board.layout === "square") {
      for (const edge of [
        ...((template?.layout === board.layout ? template.edges : undefined) ??
          []),
        ...(board.edges ?? []),
      ]) {
        addBoardUsage(boardsByEdgeType, edge.typeId, board.id);
      }
      for (const vertex of [
        ...((template?.layout === board.layout
          ? template.vertices
          : undefined) ?? []),
        ...(board.vertices ?? []),
      ]) {
        addBoardUsage(boardsByVertexType, vertex.typeId, board.id);
      }
    }
  }

  const pushWarnings = (
    kind: "space" | "edge" | "vertex",
    boardsByType: Map<string, Set<string>>,
    helperName: string,
  ) => {
    for (const [typeId, boardIds] of boardsByType.entries()) {
      if (boardIds.size < 2) {
        continue;
      }
      warnings.push(
        `Ambiguous ${kind}.typeId '${typeId}' is authored on multiple boards (${Array.from(boardIds).sort().join(", ")}). Prefer ${helperName} for board-scoped lookups.`,
      );
    }
  };

  pushWarnings(
    "space",
    boardsBySpaceType,
    "boardHelpers.spaceIdsByBoardId / boardHelpers.spaceTypeIdByBoardId",
  );
  pushWarnings(
    "edge",
    boardsByEdgeType,
    "boardHelpers.edgeIdsByBoardIdAndTypeId",
  );
  pushWarnings(
    "vertex",
    boardsByVertexType,
    "boardHelpers.vertexIdsByBoardIdAndTypeId",
  );

  return warnings;
}

export function validateManifestAuthoring(
  manifest: GameTopologyManifest,
): ManifestAuthoringValidationResult {
  const errors: string[] = [];

  errors.push(
    ...collectDuplicateIdIssues({
      entries: manifest.cardSets.map((cardSet, index) => ({
        id: cardSet.id,
        path: `manifest.cardSets[${index}].id`,
      })),
      label: "card set id",
    }),
  );
  errors.push(
    ...collectDuplicateIdIssues({
      entries: manifest.cardSets.flatMap((cardSet, cardSetIndex) =>
        cardSet.type === "manual"
          ? cardSet.cards.flatMap((card, cardIndex) =>
              renderCardInstanceIds(card).map((cardId) => ({
                id: cardId,
                path: `manifest.cardSets[${cardSetIndex}].cards[${cardIndex}].type`,
              })),
            )
          : [],
      ),
      label: "card runtime id",
    }),
  );
  errors.push(
    ...collectDuplicateIdIssues({
      entries: (manifest.zones ?? []).map((zone: ZoneSpec, index) => ({
        id: zone.id,
        path: `manifest.zones[${index}].id`,
      })),
      label: "zone id",
    }),
  );
  errors.push(
    ...collectDuplicateIdIssues({
      entries: (manifest.boardTemplates ?? []).map((boardTemplate, index) => ({
        id: boardTemplate.id,
        path: `manifest.boardTemplates[${index}].id`,
      })),
      label: "board template id",
    }),
  );
  errors.push(
    ...validateBoardTemplateDuplicates(manifest.boardTemplates ?? []),
  );
  errors.push(
    ...collectDuplicateIdIssues({
      entries: (manifest.boards ?? []).map((board, index) => ({
        id: board.id,
        path: `manifest.boards[${index}].id`,
      })),
      label: "board id",
    }),
  );
  errors.push(...validateBoardDuplicates(manifest.boards ?? []));
  errors.push(
    ...validateTypeSlotDuplicates({
      pieceTypes: manifest.pieceTypes ?? [],
      dieTypes: manifest.dieTypes ?? [],
    }),
  );
  errors.push(
    ...collectDuplicateIdIssues({
      entries: (manifest.pieceTypes ?? []).map((pieceType, index) => ({
        id: pieceType.id,
        path: `manifest.pieceTypes[${index}].id`,
      })),
      label: "piece type id",
    }),
  );
  errors.push(
    ...collectDuplicateIdIssues({
      entries: expandSeedIds(manifest.pieceSeeds ?? []).map(
        (pieceId, index) => ({
          id: pieceId,
          path: `manifest.pieceSeeds[*][${index}]`,
        }),
      ),
      label: "piece runtime id",
    }),
  );
  errors.push(
    ...collectDuplicateIdIssues({
      entries: (manifest.dieTypes ?? []).map((dieType, index) => ({
        id: dieType.id,
        path: `manifest.dieTypes[${index}].id`,
      })),
      label: "die type id",
    }),
  );
  errors.push(
    ...collectDuplicateIdIssues({
      entries: expandSeedIds(manifest.dieSeeds ?? []).map((dieId, index) => ({
        id: dieId,
        path: `manifest.dieSeeds[*][${index}]`,
      })),
      label: "die runtime id",
    }),
  );
  errors.push(
    ...collectDuplicateIdIssues({
      entries: (manifest.resources ?? []).map((resource, index) => ({
        id: resource.id,
        path: `manifest.resources[${index}].id`,
      })),
      label: "resource id",
    }),
  );
  errors.push(
    ...collectDuplicateIdIssues({
      entries: (manifest.setupOptions ?? []).map((option, index) => ({
        id: option.id,
        path: `manifest.setupOptions[${index}].id`,
      })),
      label: "setup option id",
    }),
  );
  errors.push(
    ...validateSetupOptionChoiceDuplicates(manifest.setupOptions ?? []),
  );
  errors.push(
    ...collectDuplicateIdIssues({
      entries: (manifest.setupProfiles ?? []).map((profile, index) => ({
        id: profile.id,
        path: `manifest.setupProfiles[${index}].id`,
      })),
      label: "setup profile id",
    }),
  );
  errors.push(...validateSlotHostsAndHomes(manifest));
  errors.push(...validatePlayerScopedSeedHomes(manifest));
  errors.push(...validateSetupProfileReferences(manifest));
  errors.push(...validateHexBoardVertexRefs(manifest));

  return {
    errors,
    warnings: collectAmbiguousBoardTypeWarnings(manifest),
  };
}
