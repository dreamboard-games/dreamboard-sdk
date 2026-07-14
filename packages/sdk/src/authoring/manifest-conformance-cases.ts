import type {
  BoardCard,
  BoardSpec,
  ComponentHomeSpec,
  GameTopologyManifest,
  PieceSeedSpec,
  PieceTypeSpec,
  ZoneSpec,
} from "@dreamboard-games/sdk-types";
import type { AuthoringManifestConformanceCaseV1 } from "./types.js";

function baseManifest(
  cardSet: GameTopologyManifest["cardSets"][number],
  overrides: Partial<GameTopologyManifest> = {},
): GameTopologyManifest {
  return {
    players: {
      minPlayers: 2,
      maxPlayers: 2,
      optimalPlayers: 2,
    },
    cardSets: [cardSet],
    zones: [],
    boardTemplates: [],
    boards: [],
    pieceTypes: [],
    pieceSeeds: [],
    dieTypes: [],
    dieSeeds: [],
    resources: [],
    setupOptions: [],
    setupProfiles: [],
    ...overrides,
  };
}

function manualCardSet(
  id: string,
  defaultHome: ComponentHomeSpec,
  cards: BoardCard[],
): GameTopologyManifest["cardSets"][number] {
  const cardSet = {
    id,
    name: id,
    type: "manual",
    cardSchema: { properties: {} },
    defaultHome,
    cards,
  };
  return cardSet as unknown as GameTopologyManifest["cardSets"][number];
}

const sharedZone: ZoneSpec = {
  id: "shared-zone",
  name: "Shared Zone",
  scope: "shared",
  allowedCardSetIds: ["cards"],
};

const sharedBoard: BoardSpec = {
  id: "square-board",
  name: "Square Board",
  layout: "square",
  scope: "shared",
  spaces: [
    { id: "a1", row: 0, col: 0 },
    { id: "a2", row: 0, col: 1 },
    { id: "b1", row: 1, col: 0 },
    { id: "b2", row: 1, col: 1 },
  ],
  relations: [],
  containers: [
    {
      id: "display-row",
      name: "Display Row",
      host: { type: "board" },
    },
  ],
  edges: [],
  vertices: [],
};

const sharedTopology: Partial<GameTopologyManifest> = {
  boards: [sharedBoard],
  pieceTypes: [
    {
      id: "holder",
      name: "Holder",
      slots: [{ id: "pocket" }],
    },
  ] satisfies PieceTypeSpec[],
  pieceSeeds: [{ id: "holder-a", typeId: "holder" }] satisfies PieceSeedSpec[],
};

const fixtures = [
  {
    id: "manual-default-detached",
    manifest: baseManifest(
      manualCardSet("cards", { type: "detached" }, [
        { type: "marker", name: "Marker", count: 1, properties: {} },
      ]),
    ),
    expected: {
      valid: true,
      transportValid: true,
      materializedSha256:
        "ed6f7ce2ff4fbe697e49134f1d59157cf146e202db29a77be50e8326585f535c",
    },
  },
  {
    id: "manual-default-shared-zone",
    manifest: baseManifest(
      manualCardSet("cards", { type: "zone", zoneId: "shared-zone" }, [
        { type: "coin", name: "Coin", count: 2, properties: {} },
      ]),
      { zones: [sharedZone] },
    ),
    expected: {
      valid: true,
      transportValid: true,
      materializedSha256:
        "75028d28dbc415c81db5e2d780d55b04c4db36378a149bc02b0194d94a8cc2b9",
    },
  },
  {
    id: "preset-default-shared-zone",
    manifest: baseManifest(
      {
        id: "cards",
        name: "Preset Cards",
        type: "preset",
        presetId: "standard_52_deck",
        defaultHome: { type: "zone", zoneId: "shared-zone" },
      },
      { zones: [sharedZone] },
    ),
    expected: {
      valid: true,
      transportValid: true,
      materializedSha256:
        "b3471c577ed266667b16799f75aa9b7358100a94108aa46a31ad16a0291f67ca",
    },
  },
  {
    id: "manual-per-card-detached-override",
    manifest: baseManifest(
      manualCardSet("cards", { type: "zone", zoneId: "shared-zone" }, [
        {
          type: "removed",
          name: "Removed",
          count: 1,
          home: { type: "detached" },
          properties: {},
        },
      ]),
      { zones: [sharedZone] },
    ),
    expected: {
      valid: true,
      transportValid: true,
      materializedSha256:
        "fdcb2de78fc391e11aca1f266fd8bbb348a82faa0fbbac1d8eb1defd8697a0e9",
    },
  },
  {
    id: "manual-per-card-shared-zone-override",
    manifest: baseManifest(
      manualCardSet("cards", { type: "detached" }, [
        {
          type: "dealt",
          name: "Dealt",
          count: 1,
          home: { type: "zone", zoneId: "shared-zone" },
          properties: {},
        },
      ]),
      { zones: [sharedZone] },
    ),
    expected: {
      valid: true,
      transportValid: true,
      materializedSha256:
        "b6bee1db85f16e8a12a7136c7d524591f925427c8ec04d64b07905c5bc859d7a",
    },
  },
  {
    id: "manual-compatible-zones-no-inference",
    manifest: baseManifest(
      manualCardSet("cards", { type: "detached" }, [
        { type: "token", name: "Token", count: 1, properties: {} },
      ]),
      {
        zones: [
          sharedZone,
          {
            ...sharedZone,
            id: "second-compatible-zone",
            name: "Second Compatible Zone",
          },
        ],
      },
    ),
    expected: {
      valid: true,
      transportValid: true,
      materializedSha256:
        "2727728ba3743d2b1874b2bc573b48c88f962fdcbdcdf20c62bed551d6d955c4",
    },
  },
  {
    id: "manual-per-player-zone-rejected",
    manifest: baseManifest(
      manualCardSet("cards", { type: "zone", zoneId: "hand" }, [
        { type: "secret", name: "Secret", count: 1, properties: {} },
      ]),
      {
        zones: [
          {
            id: "hand",
            name: "Hand",
            scope: "perPlayer",
            allowedCardSetIds: ["cards"],
          },
        ],
      },
    ),
    expected: {
      valid: false,
      transportValid: true,
      diagnosticCodes: ["CARD_HOME_PER_PLAYER_ZONE_REJECTED"],
    },
  },
  {
    id: "manual-space-home",
    manifest: baseManifest(
      manualCardSet(
        "cards",
        { type: "space", boardId: "square-board", spaceId: "a1" },
        [{ type: "space-card", name: "Space", count: 1, properties: {} }],
      ),
      sharedTopology,
    ),
    expected: {
      valid: true,
      transportValid: true,
      materializedSha256:
        "429abfb3276c67cdca59d3dc077fc73022a9716bccef2c43f6805ff5cce0f2c2",
    },
  },
  {
    id: "manual-container-home",
    manifest: baseManifest(
      manualCardSet(
        "cards",
        {
          type: "container",
          boardId: "square-board",
          containerId: "display-row",
        },
        [
          {
            type: "container-card",
            name: "Container",
            count: 1,
            properties: {},
          },
        ],
      ),
      sharedTopology,
    ),
    expected: {
      valid: true,
      transportValid: true,
      materializedSha256:
        "eff372263227b316d064a519cf282a6cc1d2d8df4ac04673b7f47ac518d7a2a3",
    },
  },
  {
    id: "manual-slot-home",
    manifest: baseManifest(
      manualCardSet(
        "cards",
        {
          type: "slot",
          host: { kind: "piece", id: "holder-a" },
          slotId: "pocket",
        },
        [{ type: "slot-card", name: "Slot", count: 1, properties: {} }],
      ),
      sharedTopology,
    ),
    expected: {
      valid: true,
      transportValid: true,
      materializedSha256:
        "af3111f8d861ae69b77f2f46ba3df9f2f698f3306c412efc91095544e8121ab6",
    },
  },
  {
    id: "manual-edge-home",
    manifest: baseManifest(
      manualCardSet(
        "cards",
        {
          type: "edge",
          boardId: "square-board",
          ref: { spaces: ["a1", "a2"] },
        },
        [{ type: "edge-card", name: "Edge", count: 1, properties: {} }],
      ),
      sharedTopology,
    ),
    expected: {
      valid: true,
      transportValid: true,
      materializedSha256:
        "f8606ea25f52d9bf801aa4fee9f558b60d7f39bcd601d57bdfccdf1ddbf4c500",
    },
  },
  {
    id: "manual-vertex-home",
    manifest: baseManifest(
      manualCardSet(
        "cards",
        {
          type: "vertex",
          boardId: "square-board",
          ref: { spaces: ["a1", "a2", "b1", "b2"] },
        },
        [{ type: "vertex-card", name: "Vertex", count: 1, properties: {} }],
      ),
      sharedTopology,
    ),
    expected: {
      valid: true,
      transportValid: true,
      materializedSha256:
        "e84a4920ea8b71052acd42accf11101380ab982e493ebe207113dd4d243034de",
    },
  },
  {
    id: "manual-invalid-target-id",
    manifest: baseManifest(
      manualCardSet("cards", { type: "zone", zoneId: "missing-zone" }, [
        { type: "lost", name: "Lost", count: 1, properties: {} },
      ]),
    ),
    expected: {
      valid: false,
      transportValid: true,
      diagnosticCodes: ["AUTHORING_VALIDATION_ERROR"],
    },
  },
  {
    id: "manual-count-order",
    manifest: baseManifest(
      manualCardSet("cards", { type: "zone", zoneId: "shared-zone" }, [
        { type: "first", name: "First", count: 3, properties: {} },
        { type: "second", name: "Second", count: 2, properties: {} },
      ]),
      { zones: [sharedZone] },
    ),
    expected: {
      valid: true,
      transportValid: true,
      materializedSha256:
        "2e4ced71909d4c36053317311c9ceaf3bf3adba875bff3fe9596bbea47746423",
    },
  },
  {
    id: "manual-generated-scenario-base",
    manifest: baseManifest(
      manualCardSet("cards", { type: "zone", zoneId: "shared-zone" }, [
        { type: "alpha", name: "Alpha", count: 2, properties: {} },
        { type: "beta", name: "Beta", count: 1, properties: {} },
      ]),
      { zones: [sharedZone] },
    ),
    expected: {
      valid: true,
      transportValid: true,
      materializedSha256:
        "b1b65d708b503036a49434c64c6f4aab3bedd295681bd103b69c4b98fdd5e2bb",
    },
  },
  {
    id: "manual-default-required",
    manifest: {
      ...baseManifest(
        manualCardSet("cards", { type: "detached" }, [
          { type: "card", name: "Card", count: 1, properties: {} },
        ]),
      ),
      cardSets: [
        {
          id: "cards",
          name: "Cards",
          type: "manual",
          cardSchema: { properties: {} },
          cards: [{ type: "card", name: "Card", count: 1, properties: {} }],
        },
      ],
    } as unknown as GameTopologyManifest,
    expected: {
      valid: false,
      transportValid: false,
      diagnosticCodes: ["MANUAL_CARD_SET_DEFAULT_HOME_REQUIRED"],
    },
  },
] as const satisfies readonly (Omit<
  AuthoringManifestConformanceCaseV1,
  "manifest"
> & { manifest: GameTopologyManifest })[];

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const entry of Object.values(value)) {
      deepFreeze(entry);
    }
    Object.freeze(value);
  }
  return value;
}

export function diagnosticCodesForValidationErrors(
  errors: readonly string[],
): readonly string[] {
  return [...new Set(errors.map(diagnosticCodeForValidationError))].sort();
}

function diagnosticCodeForValidationError(error: string): string {
  if (
    error.includes(".defaultHome: Manual card sets must declare defaultHome")
  ) {
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

export function createManifestConformanceCases(): readonly AuthoringManifestConformanceCaseV1[] {
  return deepFreeze(
    fixtures,
  ) as unknown as readonly AuthoringManifestConformanceCaseV1[];
}
