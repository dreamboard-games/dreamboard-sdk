import { renderCardInstanceIds, expandSeedIds } from "./identity-runtime.js";
import { PER_PLAYER_INSTANCE_PREFIX } from "../../shared/domain/per-player-instance.js";
import { analyzeManifestStructure, fieldReferenceContext } from "./materialize";
import {
  fieldSchemaKeyIssues,
  schemaForCardType,
  createFieldValidatorResolver,
} from "./field-schemas";
import type { FieldSchemaJson } from "../../shared/domain/contracts.js";
import type {
  BoardCard,
  BoardSpec,
  DieSeedSpec,
  PieceSeedSpec,
  PieceTypeSpec,
  ZoneSpec,
} from "../../shared/domain/contracts.js";
import type {
  DieTypeSpec,
  GameTopologyManifest,
} from "../../shared/domain/manifest.js";
import { createHexTopology, resolveHexSpaces } from "../../shared/hex-board.js";

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
  if (value?.startsWith(PER_PLAYER_INSTANCE_PREFIX))
    return [
      `${path}: authored identities must not begin with reserved prefix '${PER_PLAYER_INSTANCE_PREFIX}'.`,
    ];
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

function collectCardSchemaKeyIssues(
  cardSet: GameTopologyManifest["cardSets"][number],
  path: string,
): string[] {
  return fieldSchemaKeyIssues(cardSet.cardSchema, `${path}.cardSchema`);
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
    scope?: "shared" | "perPlayer",
  ) => {
    if (home?.type !== "slot") {
      return;
    }

    const seeds =
      home.host.kind === "piece" ? manifest.pieceSeeds : manifest.dieSeeds;
    if (
      scope !== "perPlayer" &&
      seeds?.find((seed) => seed.id === home.host.id)?.scope === "perPlayer"
    )
      issues.push(
        `${path}.host: Shared inventory cannot target per-player slot host '${home.host.id}'. Place it during reducer setup instead.`,
      );
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
    validateHome(
      cardSet.defaultHome,
      `manifest.cardSets[${cardSetIndex}].defaultHome`,
      "perPlayer",
    );
    for (const [cardIndex, card] of cardSet.cards.entries()) {
      validateHome(
        card.home ?? cardSet.defaultHome,
        `manifest.cardSets[${cardSetIndex}].cards[${cardIndex}].home`,
        card.scope,
      );
    }
  }

  for (const [index, seed] of (manifest.pieceSeeds ?? []).entries()) {
    validateHome(seed.home, `manifest.pieceSeeds[${index}].home`, seed.scope);
  }

  for (const [index, seed] of (manifest.dieSeeds ?? []).entries()) {
    validateHome(seed.home, `manifest.dieSeeds[${index}].home`, seed.scope);
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
    if (seed.scope === "perPlayer") {
      return;
    }

    if (
      homeTargetsBoard(seed.home) &&
      boardScopeById.get(seed.home.boardId) === "perPlayer"
    ) {
      issues.push(
        `${path}.boardId: ${label} '${authoredId}' requires perPlayer scope because board '${seed.home.boardId}' has scope 'perPlayer'. Use perPlayer scope to resolve the player-scoped destination.`,
      );
      return;
    }

    if (
      seed.home?.type === "zone" &&
      zoneScopeById.get(seed.home.zoneId) === "perPlayer"
    ) {
      issues.push(
        `${path}.zoneId: ${label} '${authoredId}' requires perPlayer scope because zone '${seed.home.zoneId}' has scope 'perPlayer'. Use perPlayer scope to resolve the player-scoped destination.`,
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
        `manifest.cardSets[${cardSetIndex}].defaultHome: Card sets must declare defaultHome.`,
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
          `${path}.zoneId: ${label} cannot target per-player zone '${home.zoneId}' because shared card inventory has no replication origin. Place it during reducer setup instead.`,
        );
      }
      if (
        homeTargetsBoard(home) &&
        boardScopeById.get(home.boardId) === "perPlayer"
      ) {
        issues.push(
          `${path}.boardId: ${label} cannot target per-player board '${home.boardId}' because shared card inventory has no replication origin. Place it during reducer setup instead.`,
        );
      }
    };

    for (const [cardIndex, card] of cardSet.cards.entries()) {
      if (card.scope === "perPlayer") continue;
      const path =
        card.home === undefined
          ? `manifest.cardSets[${cardSetIndex}].defaultHome`
          : `manifest.cardSets[${cardSetIndex}].cards[${cardIndex}].home`;
      validateCardHome(
        card.home ?? cardSet.defaultHome,
        path,
        `Card '${card.id}'`,
      );
    }
  }

  return issues;
}

const CARD_IMAGE_PATH =
  /^assets\/(?:[\w-][\w.-]*\/)*[\w-][\w.-]*\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

/** Card images are repository files that hosts publish and deliver offline. */
function validateCardImages(manifest: GameTopologyManifest): string[] {
  return manifest.cardSets.flatMap((cardSet, cardSetIndex) =>
    cardSet.cards.flatMap((card, cardIndex) =>
      (["frontImage", "backImage"] as const).flatMap((key) => {
        const image = card[key];
        return image === undefined || CARD_IMAGE_PATH.test(image)
          ? []
          : [
              `manifest.cardSets[${cardSetIndex}].cards[${cardIndex}].${key}: '${image}' must be an image path under assets/, such as assets/cards/front.webp.`,
            ];
      }),
    ),
  );
}

function homeTargetsBoard(
  home:
    BoardCard["home"] | PieceSeedSpec["home"] | DieSeedSpec["home"] | undefined,
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
      const geometry = createHexTopology({
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
    for (const space of [
      ...(board.layout === "hex"
        ? Object.values(board.spaces ?? {})
        : (board.spaces ?? [])),
    ]) {
      addBoardUsage(boardsBySpaceType, space.typeId, board.id);
    }

    if (board.layout === "hex" || board.layout === "square") {
      for (const edge of [...(board.edges ?? [])]) {
        addBoardUsage(boardsByEdgeType, edge.typeId, board.id);
      }
      for (const vertex of [...(board.vertices ?? [])]) {
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

  for (const [boardIndex, board] of (manifest.boards ?? []).entries()) {
    const boardPath = `manifest.boards[${boardIndex}]`;
    const runtimeBoardIds = board.scope === "perPlayer" ? [] : [board.id];
    issues.push(
      ...collectKeyIssues([
        { value: board.id, path: `${boardPath}.id` },
        { value: board.typeId, path: `${boardPath}.typeId` },
        ...runtimeBoardIds.map((runtimeBoardId) => ({
          value: runtimeBoardId,
          path: `${boardPath}.runtimeBoardId`,
        })),
      ]),
      ...fieldSchemaKeyIssues(
        board.boardFieldsSchema,
        `${boardPath}.boardFieldsSchema`,
      ),
      ...fieldSchemaKeyIssues(
        board.spaceFieldsSchema,
        `${boardPath}.spaceFieldsSchema`,
      ),
    );

    if (board.layout !== "hex") {
      issues.push(
        ...fieldSchemaKeyIssues(
          board.relationFieldsSchema,
          `${boardPath}.relationFieldsSchema`,
        ),
        ...fieldSchemaKeyIssues(
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
        ...fieldSchemaKeyIssues(
          board.edgeFieldsSchema,
          `${boardPath}.edgeFieldsSchema`,
        ),
        ...fieldSchemaKeyIssues(
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
  const cards = cardSets.flatMap((cardSet, cardSetIndex) =>
    cardSet.cards.flatMap((card, cardIndex) =>
      renderCardInstanceIds(card).map((cardId) => ({
        card,
        cardId,
        cardIndex,
        cardSetIndex,
      })),
    ),
  );

  return [
    ...collectKeyIssues([
      ...cardSets.map((cardSet, index) => ({
        value: cardSet.id,
        path: `manifest.cardSets[${index}].id`,
      })),
      ...cards.flatMap(({ card, cardId, cardIndex, cardSetIndex }) => [
        {
          value: card.id,
          path: `manifest.cardSets[${cardSetIndex}].cards[${cardIndex}].id`,
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
      fieldSchemaKeyIssues(
        pieceType.fieldsSchema,
        `manifest.pieceTypes[${typeIndex}].fieldsSchema`,
      ),
    ),
    ...(manifest.dieTypes ?? []).flatMap((dieType, typeIndex) =>
      fieldSchemaKeyIssues(
        dieType.fieldsSchema,
        `manifest.dieTypes[${typeIndex}].fieldsSchema`,
      ),
    ),
    ...collectBoardRecordKeyIssues(manifest),
  ];
}

function validateCounts(manifest: GameTopologyManifest): string[] {
  const errors: string[] = [];
  const check = (count: number, path: string) => {
    if (!Number.isSafeInteger(count) || count < 1) {
      errors.push(`${path}: Expected a positive safe integer.`);
    }
  };
  manifest.cardSets.forEach((set, setIndex) => {
    set.cards.forEach((card, index) =>
      check(card.count, `manifest.cardSets[${setIndex}].cards[${index}].count`),
    );
  });
  for (const family of ["pieceSeeds", "dieSeeds"] as const) {
    manifest[family]?.forEach((seed, index) => {
      if (seed.count !== undefined)
        check(seed.count, `manifest.${family}[${index}].count`);
    });
  }
  check(manifest.players.minPlayers, "manifest.players.minPlayers");
  check(manifest.players.maxPlayers, "manifest.players.maxPlayers");
  if (manifest.players.minPlayers > manifest.players.maxPlayers) {
    errors.push("manifest.players: minPlayers must not exceed maxPlayers.");
  }
  if (manifest.players.optimalPlayers !== undefined) {
    check(manifest.players.optimalPlayers, "manifest.players.optimalPlayers");
    if (
      manifest.players.optimalPlayers < manifest.players.minPlayers ||
      manifest.players.optimalPlayers > manifest.players.maxPlayers
    )
      errors.push(
        "manifest.players.optimalPlayers: Must be within minPlayers and maxPlayers.",
      );
  }
  return errors;
}

export function assertValidManifest(manifest: GameTopologyManifest): void {
  const validation = validateManifestAuthoring(manifest);
  if (validation.errors.length) {
    throw new Error(
      `Invalid topology manifest:\n${validation.errors.join("\n")}`,
    );
  }
}

export function validateManifestAuthoring(
  manifest: GameTopologyManifest,
): ManifestAuthoringValidationResult {
  const errors = validateCounts(manifest);
  // Never expand invalid counts (including Infinity) into runtime ids.
  if (errors.length) return { errors, warnings: [] };

  for (const [index, zone] of (manifest.zones ?? []).entries()) {
    if (zone.scope === "shared" && zone.visibility === "ownerOnly") {
      errors.push(
        `manifest.zones[${index}].visibility: ownerOnly requires perPlayer scope; use hidden for concealed shared contents`,
      );
    }
  }

  const componentIds = [
    ...manifest.cardSets.flatMap((set) =>
      set.cards.flatMap(renderCardInstanceIds),
    ),
    ...expandSeedIds(manifest.pieceSeeds ?? []),
    ...expandSeedIds(manifest.dieSeeds ?? []),
  ];
  for (const id of componentIds)
    if (id.startsWith("hidden:"))
      errors.push(
        `Component id '${id}' uses the reserved concealed-id namespace 'hidden:'.`,
      );
  errors.push(...collectManifestRecordKeyIssues(manifest));
  errors.push(
    ...collectDuplicateIdIssues({
      label: "component runtime id",
      entries: [
        ...manifest.cardSets.flatMap((set, setIndex) =>
          set.cards.flatMap((card, index) =>
            renderCardInstanceIds(card).map((id) => ({
              id,
              path: `manifest.cardSets[${setIndex}].cards[${index}]`,
            })),
          ),
        ),
        ...expandSeedIds(manifest.pieceSeeds ?? []).map((id, index) => ({
          id,
          path: `manifest.pieceSeeds.runtimeIds[${index}]`,
        })),
        ...expandSeedIds(manifest.dieSeeds ?? []).map((id, index) => ({
          id,
          path: `manifest.dieSeeds.runtimeIds[${index}]`,
        })),
      ],
    }),
  );
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
        cardSet.cards.flatMap((card, cardIndex) =>
          renderCardInstanceIds(card).map((cardId) => ({
            id: cardId,
            path: `manifest.cardSets[${cardSetIndex}].cards[${cardIndex}].id`,
          })),
        ),
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
  for (const [kind, seeds, types] of [
    ["pieceSeeds", manifest.pieceSeeds ?? [], manifest.pieceTypes ?? []],
    ["dieSeeds", manifest.dieSeeds ?? [], manifest.dieTypes ?? []],
  ] as const)
    for (const [index, seed] of seeds.entries()) {
      if (!types.some((type) => type.id === seed.typeId))
        errors.push(
          `manifest.${kind}[${index}].typeId: Unknown component type '${seed.typeId}'.`,
        );
    }
  for (const [cardSetIndex, cardSet] of manifest.cardSets.entries()) {
    for (const [cardIndex, card] of cardSet.cards.entries()) {
      const path = `manifest.cardSets[${cardSetIndex}].cards[${cardIndex}]`;
      if (typeof card.id !== "string" || card.id.length === 0) {
        errors.push(`${path}.id: Card definition id is required.`);
      } else if (card.id.startsWith("hidden:")) {
        errors.push(
          `${path}.id: The 'hidden:' prefix is reserved for concealed card positions.`,
        );
      }
      if (typeof card.cardType !== "string" || card.cardType.length === 0) {
        errors.push(`${path}.cardType: Card category is required.`);
      } else if (
        cardSet.cardSchema.byCardType != null &&
        typeof cardSet.cardSchema.byCardType === "object" &&
        !Object.hasOwn(cardSet.cardSchema.byCardType, card.cardType)
      ) {
        errors.push(
          `${path}.cardType: Unknown card category '${card.cardType}' for card set '${cardSet.id}'.`,
        );
      }
    }
  }
  errors.push(...validateAnalyzedManifest(manifest));
  errors.push(...validateCardImages(manifest));
  errors.push(...validateHexBoardVertexRefs(manifest));

  return {
    errors,
    warnings: collectAmbiguousBoardTypeWarnings(manifest),
  };
}

function validateAnalyzedManifest(manifest: GameTopologyManifest): string[] {
  let analysis: ReturnType<typeof analyzeManifestStructure>;
  try {
    analysis = analyzeManifestStructure(manifest);
  } catch (error) {
    return [
      `manifest: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
  const context = fieldReferenceContext(analysis, "manifest");
  const errors = validateHomeMembership(manifest, analysis);
  const resolve = createFieldValidatorResolver((boardId) =>
    boardId ? fieldReferenceContext(analysis, "manifest", boardId) : context,
  );
  function admit(
    schema: FieldSchemaJson,
    path: string,
    boardId?: string,
  ): void {
    try {
      resolve(schema, boardId);
    } catch (error) {
      errors.push(
        `${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  for (const [i, set] of manifest.cardSets.entries()) {
    if (set.cardSchema.byCardType !== undefined) {
      const variants = z
        .record(z.string(), z.record(z.string(), z.json()))
        .parse(set.cardSchema.byCardType);
      for (const [id, schema] of Object.entries(variants))
        admit(schema, `manifest.cardSets[${i}].cardSchema.byCardType.${id}`);
    } else admit(set.cardSchema, `manifest.cardSets[${i}].cardSchema`);
  }
  for (const [i, board] of (manifest.boards ?? []).entries())
    for (const key of [
      "boardFieldsSchema",
      "spaceFieldsSchema",
      "relationFieldsSchema",
      "containerFieldsSchema",
      "edgeFieldsSchema",
      "vertexFieldsSchema",
    ] as const)
      if (key in board) {
        const schema: unknown = Reflect.get(board, key);
        if (schema !== undefined)
          admit(
            z.record(z.string(), z.json()).parse(schema),
            `manifest.boards[${i}].${key}`,
            board.id,
          );
      }
  function check(
    schema: FieldSchemaJson | undefined,
    values: unknown,
    path: string,
    boardId?: string,
  ): void {
    if (!schema) return;
    try {
      const validator = resolve(schema, boardId);
      const result = validator.safeParse(values ?? {});
      if (!result.success)
        for (const issue of result.error.issues)
          errors.push(
            `${path}${issue.path.length ? "." + issue.path.join(".") : ""}: ${issue.message}`,
          );
    } catch (error) {
      errors.push(
        `${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  for (const type of [
    ...(manifest.pieceTypes ?? []),
    ...(manifest.dieTypes ?? []),
  ])
    if (type.fieldsSchema) {
      try {
        resolve(type.fieldsSchema);
      } catch (error) {
        errors.push(
          `manifest.componentTypes.${type.id}.fieldsSchema: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  for (const [si, set] of manifest.cardSets.entries())
    for (const [ci, card] of set.cards.entries()) {
      try {
        check(
          schemaForCardType(set.cardSchema, card.cardType),
          card.properties,
          `manifest.cardSets[${si}].cards[${ci}].properties`,
        );
      } catch (error) {
        errors.push(
          `manifest.cardSets[${si}].cards[${ci}].properties: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  for (const [kind, seeds, types] of [
    ["pieceSeeds", manifest.pieceSeeds ?? [], manifest.pieceTypes ?? []],
    ["dieSeeds", manifest.dieSeeds ?? [], manifest.dieTypes ?? []],
  ] as const)
    for (const [i, seed] of seeds.entries())
      check(
        types.find((type) => type.id === seed.typeId)?.fieldsSchema,
        seed.fields,
        `manifest.${kind}[${i}].fields`,
      );
  for (const [i, board] of (manifest.boards ?? []).entries()) {
    const base = `manifest.boards[${i}]`;
    check(board.boardFieldsSchema, board.fields, `${base}.fields`, board.id);
    const spaces =
      board.layout === "hex" ? resolveHexSpaces(board) : (board.spaces ?? []);
    for (const [j, space] of spaces.entries())
      check(
        board.spaceFieldsSchema,
        space.fields,
        `${base}.spaces[${j}].fields`,
        board.id,
      );
    if (board.layout !== "hex") {
      for (const [j, relation] of (board.relations ?? []).entries())
        check(
          board.relationFieldsSchema,
          relation.fields,
          `${base}.relations[${j}].fields`,
          board.id,
        );
      for (const [j, container] of (board.containers ?? []).entries())
        check(
          board.containerFieldsSchema,
          container.fields,
          `${base}.containers[${j}].fields`,
          board.id,
        );
    }
    if (board.layout !== "generic") {
      for (const [j, edge] of (board.edges ?? []).entries())
        check(
          board.edgeFieldsSchema,
          edge.fields,
          `${base}.edges[${j}].fields`,
          board.id,
        );
      for (const [j, vertex] of (board.vertices ?? []).entries())
        check(
          board.vertexFieldsSchema,
          vertex.fields,
          `${base}.vertices[${j}].fields`,
          board.id,
        );
    }
  }
  return errors;
}

function validateHomeMembership(
  manifest: GameTopologyManifest,
  analysis: ReturnType<typeof analyzeManifestStructure>,
): string[] {
  const errors: string[] = [];
  function check(home: BoardCard["home"], path: string): void {
    if (!home || home.type === "detached" || home.type === "slot") return;
    if (home.type === "zone") {
      if (!analysis.zoneIds.includes(home.zoneId))
        errors.push(`${path}.zoneId: unknown zone '${home.zoneId}'.`);
      return;
    }
    const board = analysis.analyzedBoards.find(
      (board) => board.board.id === home.boardId,
    );
    if (!board) {
      errors.push(`${path}.boardId: unknown board '${home.boardId}'.`);
      return;
    }
    if (home.type === "space") {
      if (!board.spaces.some((space) => space.id === home.spaceId))
        errors.push(
          `${path}.spaceId: unknown space '${home.spaceId}' on board '${home.boardId}'.`,
        );
    } else if (home.type === "container") {
      if (
        board.layout === "hex" ||
        !board.containers.some((container) => container.id === home.containerId)
      )
        errors.push(
          `${path}.containerId: unknown container '${home.containerId}' on board '${home.boardId}'.`,
        );
    } else {
      const matches = (ids: readonly string[]) =>
        ids.length === home.ref.spaces.length &&
        [...ids]
          .sort()
          .every((id, index) => id === [...home.ref.spaces].sort()[index]);
      const exists =
        board.layout !== "generic" &&
        (home.type === "edge"
          ? board.edges.some((edge) => matches(edge.spaceIds))
          : board.vertices.some((vertex) => matches(vertex.spaceIds)));
      if (!exists)
        errors.push(
          `${path}.ref: Unknown ${home.type} reference on board '${home.boardId}'.`,
        );
    }
  }
  for (const [si, set] of manifest.cardSets.entries()) {
    check(set.defaultHome, `manifest.cardSets[${si}].defaultHome`);
    for (const [ci, card] of set.cards.entries())
      check(card.home, `manifest.cardSets[${si}].cards[${ci}].home`);
  }
  for (const [kind, seeds] of [
    ["pieceSeeds", manifest.pieceSeeds ?? []],
    ["dieSeeds", manifest.dieSeeds ?? []],
  ] as const)
    for (const [i, seed] of seeds.entries())
      check(seed.home, `manifest.${kind}[${i}].home`);
  return errors;
}
import * as z from "zod";
