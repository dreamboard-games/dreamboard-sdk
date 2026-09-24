import type {
  BoardCard,
  BoardSpec,
  BoardTemplateSpec,
  DieSeedSpec,
  DieTypeSpec,
  GameTopologyManifest,
  PieceSeedSpec,
  PieceTypeSpec,
  PropertySchema,
  ZoneSpec,
} from "@dreamboard-games/sdk-types";
import { createHexBoardGeometry, resolveHexSpaces } from "./hex-board.js";

export type ManifestAuthoringValidationResult = {
  errors: string[];
  warnings: string[];
};

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

const PROTOTYPE_SENSITIVE_KEYS = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);

function validateRecordKey(
  value: string | null | undefined,
  path: string,
): string[] {
  if (!value || !PROTOTYPE_SENSITIVE_KEYS.has(value)) {
    return [];
  }
  return [
    `${path}: '${value}' is reserved and cannot be used as a generated record key.`,
  ];
}

function collectKeyIssues(
  entries: ReadonlyArray<{ value?: string | null; path: string }>,
): string[] {
  return entries.flatMap(({ value, path }) => validateRecordKey(value, path));
}

function toHandleKey(input: string): string {
  if (!/[_-]/.test(input)) {
    return input.charAt(0).toLowerCase() + input.slice(1);
  }
  const [first = "", ...rest] = input.split(/[_-]/g).filter(Boolean);
  return [
    first.toLowerCase(),
    ...rest.map((part) => {
      const lower = part.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    }),
  ].join("");
}

function collectHandleKeyCollisions(
  values: readonly string[],
  label: string,
): string[] {
  const idsByHandle = new Map<string, string[]>();
  for (const value of values) {
    const handle = toHandleKey(value);
    idsByHandle.set(handle, [...(idsByHandle.get(handle) ?? []), value]);
  }
  return [...idsByHandle.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(
      ([handle, ids]) =>
        `${label} values ${ids.join(", ")} all generate handle '${handle}'.`,
    );
}

function dedupeSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort();
}

function renderCardInstanceIds(card: BoardCard): string[] {
  return card.count > 1
    ? Array.from(
        { length: card.count },
        (_, index) => `${card.type}-${index + 1}`,
      )
    : [card.type];
}

function collectPropertySchemaKeyIssues(
  schema: PropertySchema | null | undefined,
  path: string,
): string[] {
  if (!schema) {
    return [];
  }
  const issues: string[] = [];
  if (schema.type === "object") {
    for (const [key, property] of Object.entries(schema.properties ?? {})) {
      issues.push(
        ...validateRecordKey(key, `${path}.properties.${key}`),
        ...collectPropertySchemaKeyIssues(
          property,
          `${path}.properties.${key}`,
        ),
      );
    }
  }
  if (schema.type === "array") {
    issues.push(
      ...collectPropertySchemaKeyIssues(schema.items, `${path}.items`),
    );
  }
  if (schema.type === "record") {
    issues.push(
      ...collectPropertySchemaKeyIssues(schema.values, `${path}.values`),
    );
  }
  return issues;
}

function collectObjectSchemaKeyIssues(
  schema:
    | {
        properties?: Record<string, PropertySchema>;
      }
    | null
    | undefined,
  path: string,
): string[] {
  const issues: string[] = [];
  for (const [key, property] of Object.entries(schema?.properties ?? {})) {
    issues.push(
      ...validateRecordKey(key, `${path}.properties.${key}`),
      ...collectPropertySchemaKeyIssues(property, `${path}.properties.${key}`),
    );
  }
  return issues;
}

function collectCardSchemaKeyIssues(
  cardSet: GameTopologyManifest["cardSets"][number],
  path: string,
): string[] {
  if (cardSet.type !== "manual") {
    return [];
  }
  const schema = cardSet.cardSchema;
  if ("variants" in schema) {
    return [
      ...Object.entries(schema.shared ?? {}).flatMap(([key, property]) => [
        ...validateRecordKey(key, `${path}.cardSchema.shared.${key}`),
        ...collectPropertySchemaKeyIssues(
          property,
          `${path}.cardSchema.shared.${key}`,
        ),
      ]),
      ...Object.entries(schema.variants).flatMap(
        ([variantKey, variantSchema]) => [
          ...validateRecordKey(
            variantKey,
            `${path}.cardSchema.variants.${variantKey}`,
          ),
          ...collectObjectSchemaKeyIssues(
            variantSchema,
            `${path}.cardSchema.variants.${variantKey}`,
          ),
        ],
      ),
    ];
  }
  return collectObjectSchemaKeyIssues(schema, `${path}.cardSchema`);
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
    validateHome(
      cardSet.defaultHome,
      `manifest.cardSets[${cardSetIndex}].defaultHome`,
    );
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

function validateCardHomes(manifest: GameTopologyManifest): string[] {
  const issues: string[] = [];
  const boardScopeById = new Map(
    (manifest.boards ?? []).map((board) => [board.id, board.scope] as const),
  );
  const zoneScopeById = new Map(
    (manifest.zones ?? []).map((zone) => [zone.id, zone.scope] as const),
  );

  for (const [cardSetIndex, cardSet] of manifest.cardSets.entries()) {
    if (!cardSet.defaultHome) {
      issues.push(
        `manifest.cardSets[${cardSetIndex}].defaultHome: ${
          cardSet.type === "manual" ? "Manual" : "Preset"
        } card sets must declare defaultHome.`,
      );
      continue;
    }
    const validateCardHome = (
      home: BoardCard["home"],
      path: string,
      label: string,
    ) => {
      if (
        home?.type === "zone" &&
        zoneScopeById.get(home.zoneId) === "perPlayer"
      ) {
        issues.push(
          `${path}.zoneId: ${label} cannot target per-player zone '${home.zoneId}' because card inventory has no ownerId. Place it during reducer setup instead.`,
        );
      }
      if (
        homeTargetsBoard(home) &&
        boardScopeById.get(home.boardId) === "perPlayer"
      ) {
        issues.push(
          `${path}.boardId: ${label} cannot target per-player board '${home.boardId}' because card inventory has no ownerId. Place it during reducer setup instead.`,
        );
      }
    };

    validateCardHome(
      cardSet.defaultHome,
      `manifest.cardSets[${cardSetIndex}].defaultHome`,
      `Card set '${cardSet.id}' defaultHome`,
    );
    for (const [cardIndex, card] of (cardSet.type === "manual"
      ? cardSet.cards
      : []
    ).entries()) {
      const path = `manifest.cardSets[${cardSetIndex}].cards[${cardIndex}].home`;
      validateCardHome(card.home, path, `Card '${card.type}'`);
    }
  }

  return issues;
}

function homeTargetsBoard(
  home:
    | BoardCard["home"]
    | PieceSeedSpec["home"]
    | DieSeedSpec["home"]
    | undefined,
): home is Extract<
  NonNullable<BoardCard["home"] | PieceSeedSpec["home"] | DieSeedSpec["home"]>,
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
          entries: Object.values(board.spaces ?? {}).map(
            (space, spaceIndex) => ({
              id: space.id,
              path: `manifest.boards[${index}].spaces[${spaceIndex}].id`,
            }),
          ),
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

function validateHexBoardVertexRefs(manifest: GameTopologyManifest): string[] {
  const issues: string[] = [];
  for (const board of manifest.boards ?? []) {
    if (board.layout !== "hex") continue;
    try {
      const geometry = createHexBoardGeometry({
        ...board,
        spaces: resolveHexSpaces(board),
      });
      const vertices = (board.vertices ?? []).map((vertex) =>
        "spaces" in vertex.ref
          ? geometry.vertex(...vertex.ref.spaces)
          : geometry.vertexAt(vertex.ref.space, vertex.ref.corner),
      );
      const edges = (board.edges ?? []).map((edge) =>
        "spaces" in edge.ref
          ? geometry.edge(...edge.ref.spaces)
          : geometry.edgeAt(edge.ref.space, edge.ref.side),
      );
      if (new Set(vertices).size !== vertices.length)
        throw new Error("Duplicate hex vertex refs.");
      if (new Set(edges).size !== edges.length)
        throw new Error("Duplicate hex edge refs.");
    } catch (error) {
      issues.push(
        `Hex board '${board.id}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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
    const template =
      board.layout !== "hex" && board.templateId
        ? boardTemplatesById.get(board.templateId)
        : undefined;
    for (const space of [
      ...((template?.layout === board.layout ? template.spaces : undefined) ??
        []),
      ...(board.layout === "hex"
        ? Object.values(board.spaces ?? {})
        : (board.spaces ?? [])),
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

function collectBoardRecordKeyIssues(manifest: GameTopologyManifest): string[] {
  const issues: string[] = [];
  const maxPlayers = manifest.players.maxPlayers;
  const playerIds = Array.from(
    { length: maxPlayers },
    (_, index) => `player-${index + 1}`,
  );

  for (const [templateIndex, boardTemplate] of (
    manifest.boardTemplates ?? []
  ).entries()) {
    const templatePath = `manifest.boardTemplates[${templateIndex}]`;
    issues.push(
      ...collectKeyIssues([
        { value: boardTemplate.id, path: `${templatePath}.id` },
        { value: boardTemplate.typeId, path: `${templatePath}.typeId` },
      ]),
      ...collectObjectSchemaKeyIssues(
        boardTemplate.boardFieldsSchema,
        `${templatePath}.boardFieldsSchema`,
      ),
      ...collectObjectSchemaKeyIssues(
        boardTemplate.spaceFieldsSchema,
        `${templatePath}.spaceFieldsSchema`,
      ),
    );

    if (
      boardTemplate.layout === "generic" ||
      boardTemplate.layout === "square"
    ) {
      issues.push(
        ...collectObjectSchemaKeyIssues(
          boardTemplate.relationFieldsSchema,
          `${templatePath}.relationFieldsSchema`,
        ),
        ...collectObjectSchemaKeyIssues(
          boardTemplate.containerFieldsSchema,
          `${templatePath}.containerFieldsSchema`,
        ),
        ...collectKeyIssues([
          ...(boardTemplate.containers ?? []).flatMap(
            (container, containerIndex) => [
              {
                value: container.id,
                path: `${templatePath}.containers[${containerIndex}].id`,
              },
              {
                value:
                  container.host.type === "space"
                    ? container.host.spaceId
                    : undefined,
                path: `${templatePath}.containers[${containerIndex}].host.spaceId`,
              },
            ],
          ),
          ...(boardTemplate.relations ?? []).flatMap(
            (relation, relationIndex) => [
              {
                value: relation.id,
                path: `${templatePath}.relations[${relationIndex}].id`,
              },
              {
                value: relation.typeId,
                path: `${templatePath}.relations[${relationIndex}].typeId`,
              },
              {
                value: relation.fromSpaceId,
                path: `${templatePath}.relations[${relationIndex}].fromSpaceId`,
              },
              {
                value: relation.toSpaceId,
                path: `${templatePath}.relations[${relationIndex}].toSpaceId`,
              },
            ],
          ),
        ]),
      );
    }

    if (boardTemplate.layout !== "generic") {
      issues.push(
        ...collectObjectSchemaKeyIssues(
          boardTemplate.edgeFieldsSchema,
          `${templatePath}.edgeFieldsSchema`,
        ),
        ...collectObjectSchemaKeyIssues(
          boardTemplate.vertexFieldsSchema,
          `${templatePath}.vertexFieldsSchema`,
        ),
        ...collectKeyIssues([
          ...(boardTemplate.edges ?? []).map((edge, edgeIndex) => ({
            value: edge.typeId,
            path: `${templatePath}.edges[${edgeIndex}].typeId`,
          })),
          ...(boardTemplate.vertices ?? []).map((vertex, vertexIndex) => ({
            value: vertex.typeId,
            path: `${templatePath}.vertices[${vertexIndex}].typeId`,
          })),
        ]),
      );
    }

    issues.push(
      ...collectKeyIssues(
        (boardTemplate.spaces ?? []).flatMap((space, spaceIndex) => [
          {
            value: space.id,
            path: `${templatePath}.spaces[${spaceIndex}].id`,
          },
          {
            value: space.typeId,
            path: `${templatePath}.spaces[${spaceIndex}].typeId`,
          },
        ]),
      ),
    );
  }

  for (const [boardIndex, board] of (manifest.boards ?? []).entries()) {
    const boardPath = `manifest.boards[${boardIndex}]`;
    const runtimeBoardIds =
      board.scope === "perPlayer"
        ? playerIds.map((playerId) => `${board.id}:${playerId}`)
        : [board.id];
    issues.push(
      ...collectKeyIssues([
        { value: board.id, path: `${boardPath}.id` },
        { value: board.typeId, path: `${boardPath}.typeId` },
        {
          value: board.layout !== "hex" ? board.templateId : undefined,
          path: `${boardPath}.templateId`,
        },
        ...runtimeBoardIds.map((runtimeBoardId) => ({
          value: runtimeBoardId,
          path: `${boardPath}.runtimeBoardId`,
        })),
      ]),
      ...collectObjectSchemaKeyIssues(
        board.boardFieldsSchema,
        `${boardPath}.boardFieldsSchema`,
      ),
      ...collectObjectSchemaKeyIssues(
        board.spaceFieldsSchema,
        `${boardPath}.spaceFieldsSchema`,
      ),
    );

    if (board.layout !== "hex") {
      issues.push(
        ...collectObjectSchemaKeyIssues(
          board.relationFieldsSchema,
          `${boardPath}.relationFieldsSchema`,
        ),
        ...collectObjectSchemaKeyIssues(
          board.containerFieldsSchema,
          `${boardPath}.containerFieldsSchema`,
        ),
        ...collectKeyIssues([
          ...(board.containers ?? []).flatMap((container, containerIndex) => [
            {
              value: container.id,
              path: `${boardPath}.containers[${containerIndex}].id`,
            },
            {
              value:
                container.host.type === "space"
                  ? container.host.spaceId
                  : undefined,
              path: `${boardPath}.containers[${containerIndex}].host.spaceId`,
            },
          ]),
          ...(board.relations ?? []).flatMap((relation, relationIndex) => [
            {
              value: relation.id,
              path: `${boardPath}.relations[${relationIndex}].id`,
            },
            {
              value: relation.typeId,
              path: `${boardPath}.relations[${relationIndex}].typeId`,
            },
            {
              value: relation.fromSpaceId,
              path: `${boardPath}.relations[${relationIndex}].fromSpaceId`,
            },
            {
              value: relation.toSpaceId,
              path: `${boardPath}.relations[${relationIndex}].toSpaceId`,
            },
          ]),
        ]),
      );
    }

    if (board.layout !== "generic") {
      issues.push(
        ...collectObjectSchemaKeyIssues(
          board.edgeFieldsSchema,
          `${boardPath}.edgeFieldsSchema`,
        ),
        ...collectObjectSchemaKeyIssues(
          board.vertexFieldsSchema,
          `${boardPath}.vertexFieldsSchema`,
        ),
        ...collectKeyIssues([
          ...(board.edges ?? []).map((edge, edgeIndex) => ({
            value: edge.typeId,
            path: `${boardPath}.edges[${edgeIndex}].typeId`,
          })),
          ...(board.vertices ?? []).map((vertex, vertexIndex) => ({
            value: vertex.typeId,
            path: `${boardPath}.vertices[${vertexIndex}].typeId`,
          })),
        ]),
      );
    }

    issues.push(
      ...collectKeyIssues(
        (board.layout === "hex"
          ? Object.values(board.spaces ?? {})
          : (board.spaces ?? [])
        ).flatMap((space, spaceIndex) => [
          {
            value: space.id,
            path: `${boardPath}.spaces[${spaceIndex}].id`,
          },
          {
            value: space.typeId,
            path: `${boardPath}.spaces[${spaceIndex}].typeId`,
          },
        ]),
      ),
    );
  }

  return issues;
}

function collectManifestRecordKeyIssues(
  manifest: GameTopologyManifest,
): string[] {
  const cardSets = manifest.cardSets;
  const manualCards = cardSets.flatMap((cardSet, cardSetIndex) =>
    cardSet.type === "manual"
      ? cardSet.cards.flatMap((card, cardIndex) =>
          renderCardInstanceIds(card).map((cardId) => ({
            card,
            cardId,
            cardIndex,
            cardSetIndex,
          })),
        )
      : [],
  );

  return [
    ...collectKeyIssues([
      ...cardSets.map((cardSet, index) => ({
        value: cardSet.id,
        path: `manifest.cardSets[${index}].id`,
      })),
      ...manualCards.flatMap(({ card, cardId, cardIndex, cardSetIndex }) => [
        {
          value: card.type,
          path: `manifest.cardSets[${cardSetIndex}].cards[${cardIndex}].type`,
        },
        {
          value: card.cardType,
          path: `manifest.cardSets[${cardSetIndex}].cards[${cardIndex}].cardType`,
        },
        {
          value: cardId,
          path: `manifest.cardSets[${cardSetIndex}].cards[${cardIndex}].runtimeId`,
        },
      ]),
      ...(manifest.zones ?? []).map((zone, index) => ({
        value: zone.id,
        path: `manifest.zones[${index}].id`,
      })),
      ...(manifest.resources ?? []).map((resource, index) => ({
        value: resource.id,
        path: `manifest.resources[${index}].id`,
      })),
      ...(manifest.pieceTypes ?? []).flatMap((pieceType, typeIndex) => [
        {
          value: pieceType.id,
          path: `manifest.pieceTypes[${typeIndex}].id`,
        },
        ...(pieceType.slots ?? []).map((slot, slotIndex) => ({
          value: slot.id,
          path: `manifest.pieceTypes[${typeIndex}].slots[${slotIndex}].id`,
        })),
      ]),
      ...(manifest.dieTypes ?? []).flatMap((dieType, typeIndex) => [
        {
          value: dieType.id,
          path: `manifest.dieTypes[${typeIndex}].id`,
        },
        ...(dieType.slots ?? []).map((slot, slotIndex) => ({
          value: slot.id,
          path: `manifest.dieTypes[${typeIndex}].slots[${slotIndex}].id`,
        })),
      ]),
      ...expandSeedIds(manifest.pieceSeeds ?? []).map((pieceId, index) => ({
        value: pieceId,
        path: `manifest.pieceSeeds[*][${index}]`,
      })),
      ...expandSeedIds(manifest.dieSeeds ?? []).map((dieId, index) => ({
        value: dieId,
        path: `manifest.dieSeeds[*][${index}]`,
      })),
    ]),
    ...cardSets.flatMap((cardSet, cardSetIndex) =>
      collectCardSchemaKeyIssues(cardSet, `manifest.cardSets[${cardSetIndex}]`),
    ),
    ...(manifest.pieceTypes ?? []).flatMap((pieceType, typeIndex) =>
      collectObjectSchemaKeyIssues(
        pieceType.fieldsSchema,
        `manifest.pieceTypes[${typeIndex}].fieldsSchema`,
      ),
    ),
    ...(manifest.dieTypes ?? []).flatMap((dieType, typeIndex) =>
      collectObjectSchemaKeyIssues(
        dieType.fieldsSchema,
        `manifest.dieTypes[${typeIndex}].fieldsSchema`,
      ),
    ),
    ...collectBoardRecordKeyIssues(manifest),
    ...collectHandleKeyCollisions(
      dedupeSorted(manualCards.map(({ card }) => card.cardType ?? card.type)),
      "Card type",
    ),
    ...collectHandleKeyCollisions(
      dedupeSorted((manifest.zones ?? []).map((zone) => zone.id)),
      "Zone",
    ),
  ];
}

export function validateManifestAuthoring(
  manifest: GameTopologyManifest,
): ManifestAuthoringValidationResult {
  const errors: string[] = [];

  errors.push(...collectManifestRecordKeyIssues(manifest));
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
  errors.push(...validateSlotHostsAndHomes(manifest));
  errors.push(...validatePlayerScopedSeedHomes(manifest));
  errors.push(...validateCardHomes(manifest));
  errors.push(...validateHexBoardVertexRefs(manifest));

  return {
    errors,
    warnings: collectAmbiguousBoardTypeWarnings(manifest),
  };
}
