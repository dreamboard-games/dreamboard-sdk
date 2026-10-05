import { AuthoredTileDisclosureSchema } from "../../shared/domain/tile-disclosure.js";
import { TileTypeSpecSchema } from "../../shared/domain/manifest-schema.js";
import * as z from "zod";
import { renderCardInstanceIds, expandSeedIds } from "./identity-runtime.js";
import { GENERATED_ID_PREFIX } from "../../shared/domain/per-player-instance.js";
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
  ZoneSpec,
  TileSeedSpec,
} from "../../shared/domain/contracts.js";
import type { GameTopologyManifest } from "../../shared/domain/manifest.js";

export type ManifestAuthoringValidationResult = {
  errors: string[];
  warnings: string[];
};

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
  if (value?.startsWith(GENERATED_ID_PREFIX))
    return [
      `${path}: authored identities must not begin with reserved prefix '${GENERATED_ID_PREFIX}'.`,
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

function validatePlayerScopedSeedHomes(
  manifest: GameTopologyManifest,
): string[] {
  const issues: string[] = [];
  const boardScopeById = new Map(
    (manifest.boards ?? []).map((board) => [board.id, board.scope] as const),
  );
  const zoneScopeById = new Map(
    (manifest.zones ?? []).map(
      (zone) => [zone.id, "scope" in zone ? zone.scope : undefined] as const,
    ),
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
    (manifest.zones ?? []).map(
      (zone) => [zone.id, "scope" in zone ? zone.scope : undefined] as const,
    ),
  );

  for (const [cardSetIndex, cardSet] of manifest.cardSets.entries()) {
    if (!cardSet.defaultHome) {
      issues.push(
        `manifest.cardSets[${cardSetIndex}].defaultHome: Card sets must declare defaultHome.`,
      );
      continue;
    }
    const validateCardHome = (
      home: BoardCard["home"] | TileSeedSpec["home"],
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

const ASSET_IMAGE_PATH =
  /^assets\/(?:[\w-][\w.-]*\/)*[\w-][\w.-]*\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

/** Card images are repository files that hosts publish and deliver offline. */
function validateCardImages(manifest: GameTopologyManifest): string[] {
  return manifest.cardSets.flatMap((cardSet, cardSetIndex) =>
    cardSet.cards.flatMap((card, cardIndex) =>
      (["frontImage", "backImage"] as const).flatMap((key) => {
        const image = card[key];
        return image === undefined || ASSET_IMAGE_PATH.test(image)
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
    | BoardCard["home"]
    | PieceSeedSpec["home"]
    | DieSeedSpec["home"]
    | TileSeedSpec["home"]
    | undefined,
): home is Extract<
  NonNullable<BoardCard["home"] | PieceSeedSpec["home"] | DieSeedSpec["home"]>,
  { type: "space" | "edge" | "vertex" }
> {
  return (
    home?.type === "space" || home?.type === "edge" || home?.type === "vertex"
  );
}

function validateBoardDuplicates(boards: readonly BoardSpec[]): string[] {
  return boards.flatMap((board, index) => [
    ...(board.layout === "generic"
      ? collectDuplicateIdIssues({
          entries: (board.spaces ?? []).map((space, i) => ({
            id: space.id,
            path: `manifest.boards[${index}].spaces[${i}].id`,
          })),
          label: "space id",
        })
      : []),
    ...collectDuplicateIdIssues({
      entries: (board.relations ?? []).map((relation, i) => ({
        id: relation.id,
        path: `manifest.boards[${index}].relations[${i}].id`,
      })),
      label: "relation id",
    }),
  ]);
}
function collectBoardRecordKeyIssues(manifest: GameTopologyManifest): string[] {
  const issues: string[] = [];
  for (const [i, board] of (manifest.boards ?? []).entries()) {
    const path = `manifest.boards[${i}]`;
    if (board.visibility === "ownerOnly" && board.scope === "shared")
      issues.push(`${path}.visibility: ownerOnly requires perPlayer scope.`);
    issues.push(
      ...collectKeyIssues([
        { value: board.id, path: `${path}.id` },
        { value: board.typeId, path: `${path}.typeId` },
      ]),
      ...fieldSchemaKeyIssues(
        board.boardFieldsSchema,
        `${path}.boardFieldsSchema`,
      ),
      ...fieldSchemaKeyIssues(
        board.relationFieldsSchema,
        `${path}.relationFieldsSchema`,
      ),
    );
    if (board.layout === "generic") {
      issues.push(
        ...fieldSchemaKeyIssues(
          board.spaceFieldsSchema,
          `${path}.spaceFieldsSchema`,
        ),
      );
      for (const [j, space] of (board.spaces ?? []).entries())
        issues.push(
          ...collectKeyIssues([
            { value: space.id, path: `${path}.spaces[${j}].id` },
            { value: space.typeId, path: `${path}.spaces[${j}].typeId` },
          ]),
        );
    }
    for (const [j, relation] of (board.relations ?? []).entries())
      issues.push(
        ...collectKeyIssues([
          { value: relation.id, path: `${path}.relations[${j}].id` },
          { value: relation.typeId, path: `${path}.relations[${j}].typeId` },
        ]),
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
      ]),
      ...(manifest.dieTypes ?? []).flatMap((dieType, typeIndex) => [
        {
          value: dieType.id,
          path: `manifest.dieTypes[${typeIndex}].id`,
        },
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

function validateTileDefinitions(manifest: GameTopologyManifest): string[] {
  const errors: string[] = [];
  errors.push(
    ...collectDuplicateIdIssues({
      entries: (manifest.tileTypes ?? []).map((type, i) => ({
        id: type.id,
        path: `manifest.tileTypes[${i}].id`,
      })),
      label: "tile type id",
    }),
  );
  for (const [i, type] of (manifest.tileTypes ?? []).entries()) {
    const path = `manifest.tileTypes[${i}]`;
    const parsed = TileTypeSpecSchema.safeParse(type);
    if (!parsed.success)
      for (const issue of parsed.error.issues)
        errors.push(`${path}.${issue.path.join(".")}: ${issue.message}`);
    errors.push(...validateRecordKey(type.id, `${path}.id`));
    errors.push(
      ...collectDuplicateIdIssues({
        entries: type.cells.map((cell, j) => ({
          id: cell.id,
          path: `${path}.cells[${j}].id`,
        })),
        label: "tile local cell id",
      }),
    );
    const coordinates = new Set<string>();
    for (const [j, cell] of type.cells.entries()) {
      errors.push(...validateRecordKey(cell.id, `${path}.cells[${j}].id`));
      errors.push(
        ...validateRecordKey(cell.typeId, `${path}.cells[${j}].typeId`),
      );
      const key =
        "q" in cell.at
          ? JSON.stringify([cell.at.q, cell.at.r])
          : JSON.stringify([cell.at.col, cell.at.row]);
      if (coordinates.has(key))
        errors.push(`${path}.cells[${j}].at: Duplicate tile local coordinate.`);
      coordinates.add(key);
    }
    for (const kind of ["edges", "vertices"] as const) {
      const addresses = new Set<string>();
      for (const [j, annotation] of (type[kind] ?? []).entries()) {
        errors.push(
          ...validateRecordKey(
            annotation.typeId,
            `${path}.${kind}[${j}].typeId`,
          ),
        );
        if (!type.cells.some((cell) => cell.id === annotation.cellId))
          errors.push(
            `${path}.${kind}[${j}].cellId: Unknown tile cell '${annotation.cellId}'.`,
          );
        const address = JSON.stringify([
          annotation.cellId,
          "side" in annotation ? annotation.side : annotation.corner,
        ]);
        if (addresses.has(address))
          errors.push(
            `${path}.${kind}[${j}]: Duplicate tile annotation address.`,
          );
        addresses.add(address);
      }
    }
    if (
      type.frontImage !== undefined &&
      !ASSET_IMAGE_PATH.test(type.frontImage)
    )
      errors.push(`${path}.frontImage: Must be an image path under assets/.`);
    for (const key of [
      "fieldsSchema",
      "propertiesSchema",
      "cellFieldsSchema",
      "edgeFieldsSchema",
      "vertexFieldsSchema",
    ] as const)
      errors.push(...fieldSchemaKeyIssues(type[key], `${path}.${key}`));
  }
  for (const [i, seed] of (manifest.tileSeeds ?? []).entries()) {
    errors.push(...validateRecordKey(seed.id, `manifest.tileSeeds[${i}].id`));
    if (seed.disclosure !== undefined) {
      const disclosure = AuthoredTileDisclosureSchema.safeParse(
        seed.disclosure,
      );
      if (!disclosure.success)
        errors.push(
          `manifest.tileSeeds[${i}].disclosure: ${disclosure.error.message}`,
        );
      if (
        seed.disclosure.appearance?.backImage !== undefined &&
        !ASSET_IMAGE_PATH.test(seed.disclosure.appearance.backImage)
      )
        errors.push(
          `manifest.tileSeeds[${i}].disclosure.appearance.backImage: Must be an image path under assets/.`,
        );
      if (
        seed.home?.type === "board" &&
        seed.disclosure.appearance !== undefined &&
        seed.disclosure.appearance.layout !== seed.home.layout
      )
        errors.push(
          `manifest.tileSeeds[${i}].disclosure.appearance.layout: Must match board placement layout.`,
        );
    }
    for (const id of expandSeedIds([seed]))
      errors.push(...validateRecordKey(id, `manifest.tileSeeds[${i}].id`));
    if (seed.home?.type === "zone") {
      const zoneId = seed.home.zoneId;
      const zone = manifest.zones?.find((zone) => zone.id === zoneId);
      if (
        zone &&
        "scope" in zone &&
        zone.scope === "perPlayer" &&
        seed.scope !== "perPlayer"
      )
        errors.push(
          `manifest.tileSeeds[${i}].home: Shared tile inventory cannot infer a per-player host.`,
        );
    }
  }
  return errors;
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
  for (const family of ["pieceSeeds", "dieSeeds", "tileSeeds"] as const) {
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
    if (
      "scope" in zone &&
      zone.scope === "shared" &&
      zone.visibility === "ownerOnly"
    ) {
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
    ...expandSeedIds(manifest.tileSeeds ?? []),
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
        ...expandSeedIds(manifest.tileSeeds ?? []).map((id, index) => ({
          id,
          path: `manifest.tileSeeds.runtimeIds[${index}]`,
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
  errors.push(...validatePlayerScopedSeedHomes(manifest));
  errors.push(...validateCardHomes(manifest));
  errors.push(...validateTileDefinitions(manifest));
  for (const [kind, seeds, types] of [
    ["pieceSeeds", manifest.pieceSeeds ?? [], manifest.pieceTypes ?? []],
    ["dieSeeds", manifest.dieSeeds ?? [], manifest.dieTypes ?? []],
    ["tileSeeds", manifest.tileSeeds ?? [], manifest.tileTypes ?? []],
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

  return {
    errors,
    warnings: [],
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
  for (const [i, type] of (manifest.tileTypes ?? []).entries()) {
    const path = `manifest.tileTypes[${i}]`;
    for (const key of [
      "fieldsSchema",
      "propertiesSchema",
      "cellFieldsSchema",
      "edgeFieldsSchema",
      "vertexFieldsSchema",
    ] as const)
      if (type[key]) {
        try {
          resolve(type[key]);
        } catch (error) {
          errors.push(
            `${path}.${key}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    check(type.fieldsSchema, type.fields, `${path}.fields`);
    for (const [j, cell] of type.cells.entries())
      check(type.cellFieldsSchema, cell.fields, `${path}.cells[${j}].fields`);
    for (const [j, edge] of (type.edges ?? []).entries())
      check(type.edgeFieldsSchema, edge.fields, `${path}.edges[${j}].fields`);
    for (const [j, vertex] of (type.vertices ?? []).entries())
      check(
        type.vertexFieldsSchema,
        vertex.fields,
        `${path}.vertices[${j}].fields`,
      );
  }
  for (const [i, seed] of (manifest.tileSeeds ?? []).entries())
    check(
      manifest.tileTypes?.find((type) => type.id === seed.typeId)
        ?.propertiesSchema,
      seed.properties,
      `manifest.tileSeeds[${i}].properties`,
    );
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
    const spaces = board.layout === "generic" ? (board.spaces ?? []) : [];
    for (const [j, space] of spaces.entries())
      check(
        board.layout === "generic" ? board.spaceFieldsSchema : undefined,
        space.fields,
        `${base}.spaces[${j}].fields`,
        board.id,
      );
    {
      for (const [j, relation] of (board.relations ?? []).entries())
        check(
          board.relationFieldsSchema,
          relation.fields,
          `${base}.relations[${j}].fields`,
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
  function check(
    home: BoardCard["home"] | TileSeedSpec["home"],
    path: string,
    scope: "shared" | "perPlayer" = "shared",
  ): void {
    if (!home || home.type === "detached") return;
    if (home.type === "zone") {
      const zone = manifest.zones?.find((zone) => zone.id === home.zoneId);
      if (!zone) {
        errors.push(`${path}.zoneId: unknown zone '${home.zoneId}'.`);
        return;
      }
      if ("scope" in zone) {
        if (home.component !== undefined)
          errors.push(
            `${path}.component: This zone does not have a component host.`,
          );
      } else if ("board" in zone.attachedTo) {
        if (home.component !== undefined)
          errors.push(`${path}.component: This zone has a board host.`);
        const attachedBoard = zone.attachedTo.board;
        const board = manifest.boards?.find(
          (board) => board.id === attachedBoard,
        );
        if (scope !== "perPlayer" && board?.scope === "perPlayer")
          errors.push(
            `${path}: Shared inventory cannot infer a per-player board host.`,
          );
      } else {
        const attachment = zone.attachedTo;
        const type =
          "pieceType" in attachment
            ? attachment.pieceType
            : "dieType" in attachment
              ? attachment.dieType
              : attachment.tileType;
        const seeds =
          "pieceType" in attachment
            ? manifest.pieceSeeds
            : "dieType" in attachment
              ? manifest.dieSeeds
              : manifest.tileSeeds;
        const host = seeds?.find(
          (seed) =>
            seed.typeId === type &&
            expandSeedIds([seed]).includes(home.component ?? ""),
        );
        if (!host)
          errors.push(
            `${path}.component: Expected an expanded component base of type '${type}'.`,
          );
        else if (scope !== "perPlayer" && host.scope === "perPlayer")
          errors.push(
            `${path}: Shared inventory cannot infer a per-player component host.`,
          );
      }
      return;
    }
    const board = analysis.analyzedBoards.find(
      (board) => board.board.id === home.boardId,
    );
    if (!board) {
      errors.push(`${path}.boardId: unknown board '${home.boardId}'.`);
      return;
    }
    if (home.type === "board") {
      if (board.layout === "generic" || board.layout !== home.layout)
        errors.push(`${path}: Tile home requires matching tiled board layout.`);
      if (scope !== "perPlayer" && board.board.scope === "perPlayer")
        errors.push(`${path}: Shared tile cannot infer per-player board.`);
      return;
    }
    if (home.type === "space") {
      if (!board.spaces.some((space) => space.id === home.spaceId))
        errors.push(
          `${path}.spaceId: unknown space '${home.spaceId}' on board '${home.boardId}'.`,
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
  for (const [index, zone] of (manifest.zones ?? []).entries()) {
    if (!("attachedTo" in zone)) continue;
    const attachment = zone.attachedTo;
    const path = `manifest.zones[${index}].attachedTo`;
    if ("board" in attachment) {
      const board = analysis.analyzedBoards.find(
        (board) => board.board.id === attachment.board,
      );
      if (!board)
        errors.push(`${path}.board: Unknown board '${attachment.board}'.`);
      else {
        if (
          "space" in attachment &&
          (board.layout !== "generic" ||
            !board.spaces.some((space) => space.id === attachment.space))
        )
          errors.push(`${path}.space: Unknown space '${attachment.space}'.`);
        if (zone.visibility === "ownerOnly" && board.board.scope === "shared")
          errors.push(`${path}: ownerOnly requires an owned host.`);
      }
    } else if ("pieceType" in attachment) {
      if (!analysis.pieceTypeIds.includes(attachment.pieceType))
        errors.push(
          `${path}.pieceType: Unknown piece type '${attachment.pieceType}'.`,
        );
    } else if ("dieType" in attachment) {
      if (!analysis.dieTypeIds.includes(attachment.dieType))
        errors.push(
          `${path}.dieType: Unknown die type '${attachment.dieType}'.`,
        );
    } else {
      const type = manifest.tileTypes?.find(
        (type) => type.id === attachment.tileType,
      );
      if (!type || !type.cells.some((cell) => cell.id === attachment.cell))
        errors.push(`${path}: Unknown tile type or local cell.`);
    }
  }
  for (const [si, set] of manifest.cardSets.entries()) {
    check(set.defaultHome, `manifest.cardSets[${si}].defaultHome`, "perPlayer");
    for (const [ci, card] of set.cards.entries())
      check(
        card.home ?? set.defaultHome,
        `manifest.cardSets[${si}].cards[${ci}].home`,
        card.scope,
      );
  }
  for (const [kind, seeds] of [
    ["pieceSeeds", manifest.pieceSeeds ?? []],
    ["dieSeeds", manifest.dieSeeds ?? []],
    ["tileSeeds", manifest.tileSeeds ?? []],
  ] as const)
    for (const [i, seed] of seeds.entries())
      check(seed.home, `manifest.${kind}[${i}].home`, seed.scope);
  return errors;
}
