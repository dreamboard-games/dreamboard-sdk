import type {
  GameTopologyManifest,
  JsonValue,
} from "@dreamboard-games/sdk-types";
import type {
  AuthoringManifestConformanceCaseV1,
  AuthoringValidationResultV1,
} from "./types.js";

type ConformanceCaseRuntime = {
  materializeManifest(manifest: GameTopologyManifest): JsonValue;
  sha256(input: string): string;
  stableJson(value: unknown): string;
  validateManifest(manifest: GameTopologyManifest): AuthoringValidationResultV1;
};

function baseManifest(
  cardSet: GameTopologyManifest["cardSets"][number],
  zones: NonNullable<GameTopologyManifest["zones"]> = [],
  boards: NonNullable<GameTopologyManifest["boards"]> = [],
): GameTopologyManifest {
  return {
    players: {
      minPlayers: 2,
      maxPlayers: 2,
      optimalPlayers: 2,
    },
    cardSets: [cardSet],
    zones,
    boardTemplates: [],
    boards,
    pieceTypes: [],
    pieceSeeds: [],
    dieTypes: [],
    dieSeeds: [],
    resources: [],
    setupOptions: [],
    setupProfiles: [],
  };
}

const detachedDefaultManifest = baseManifest({
  id: "detached-cards",
  name: "Detached Cards",
  type: "manual",
  cardSchema: { properties: {} },
  defaultHome: { type: "detached" },
  cards: [
    {
      type: "marker",
      name: "Marker",
      count: 2,
      properties: {},
    },
  ],
});

const sharedZoneDefaultManifest = baseManifest(
  {
    id: "market-cards",
    name: "Market Cards",
    type: "manual",
    cardSchema: { properties: {} },
    defaultHome: { type: "zone", zoneId: "market" },
    cards: [
      {
        type: "coin",
        name: "Coin",
        count: 2,
        properties: {},
      },
    ],
  },
  [
    {
      id: "market",
      name: "Market",
      scope: "shared",
      allowedCardSetIds: ["market-cards"],
    },
    {
      id: "discard",
      name: "Discard",
      scope: "shared",
      allowedCardSetIds: ["market-cards"],
    },
  ],
);

const perCardOverrideManifest = baseManifest(
  {
    id: "mixed-cards",
    name: "Mixed Cards",
    type: "manual",
    cardSchema: { properties: {} },
    defaultHome: { type: "zone", zoneId: "draw" },
    cards: [
      {
        type: "drawn",
        name: "Drawn",
        count: 1,
        properties: {},
      },
      {
        type: "removed",
        name: "Removed",
        count: 1,
        home: { type: "detached" },
        properties: {},
      },
    ],
  },
  [
    {
      id: "draw",
      name: "Draw",
      scope: "shared",
      allowedCardSetIds: ["mixed-cards"],
    },
  ],
);

const missingDefaultManifest = {
  ...detachedDefaultManifest,
  cardSets: [
    {
      id: "missing-default",
      name: "Missing Default",
      type: "manual",
      cardSchema: { properties: {} },
      cards: [
        {
          type: "card",
          name: "Card",
          count: 1,
          properties: {},
        },
      ],
    },
  ],
} as unknown as GameTopologyManifest;

const perPlayerDefaultManifest = baseManifest(
  {
    id: "private-cards",
    name: "Private Cards",
    type: "manual",
    cardSchema: { properties: {} },
    defaultHome: { type: "zone", zoneId: "hand" },
    cards: [
      {
        type: "secret",
        name: "Secret",
        count: 1,
        properties: {},
      },
    ],
  },
  [
    {
      id: "hand",
      name: "Hand",
      scope: "perPlayer",
      allowedCardSetIds: ["private-cards"],
    },
  ],
);

function validCase(
  runtime: ConformanceCaseRuntime,
  id: string,
  manifest: GameTopologyManifest,
): AuthoringManifestConformanceCaseV1 {
  return {
    id,
    manifest: manifest as JsonValue,
    expected: {
      valid: true,
      materializedSha256: runtime.sha256(
        runtime.stableJson(runtime.materializeManifest(manifest)),
      ),
    },
  };
}

function invalidCase(
  runtime: ConformanceCaseRuntime,
  id: string,
  manifest: GameTopologyManifest,
): AuthoringManifestConformanceCaseV1 {
  const validation = runtime.validateManifest(manifest);
  return {
    id,
    manifest: manifest as JsonValue,
    expected: {
      valid: false,
      diagnosticCodes: diagnosticCodesForValidationErrors(validation.errors),
    },
  };
}

export function diagnosticCodesForValidationErrors(
  errors: readonly string[],
): readonly string[] {
  return [...new Set(errors.map(diagnosticCodeForValidationError))].sort();
}

function diagnosticCodeForValidationError(error: string): string {
  if (error.includes(".defaultHome: Manual card sets must declare defaultHome")) {
    return "MANUAL_CARD_SET_DEFAULT_HOME_REQUIRED";
  }
  if (error.includes("cannot target per-player zone")) {
    return "CARD_HOME_PER_PLAYER_ZONE_REJECTED";
  }
  if (error.includes("cannot target per-player board")) {
    return "CARD_HOME_PER_PLAYER_BOARD_REJECTED";
  }
  return "AUTHORING_VALIDATION_ERROR";
}

export function createManifestConformanceCases(
  runtime: ConformanceCaseRuntime,
): readonly AuthoringManifestConformanceCaseV1[] {
  return [
    validCase(runtime, "manual-default-detached", detachedDefaultManifest),
    validCase(runtime, "manual-default-shared-zone", sharedZoneDefaultManifest),
    validCase(
      runtime,
      "manual-per-card-detached-override",
      perCardOverrideManifest,
    ),
    invalidCase(runtime, "manual-default-required", missingDefaultManifest),
    invalidCase(
      runtime,
      "manual-per-player-zone-rejected",
      perPlayerDefaultManifest,
    ),
  ];
}
