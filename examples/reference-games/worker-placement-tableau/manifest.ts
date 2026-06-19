import { defineTopologyManifest } from "@dreamboard-games/sdk/types";

// Artisans' Guild — 2-player worker-placement reference example.
//
// Topology summary:
//   • Shared 3×3 action board: 6 fixed spaces + 6 candidate variable spaces
//     (3 of which are activated at setup). All 12 candidates are declared as
//     spaces in the template; setup chooses 9 active ones via runtime state.
//   • Shared 1×4 wake-up track with one space per turn-order slot.
//   • Per-player 4×3 workshop mat (square layout) where crafted items live.
//   • Two card sets: Orders (10 unique contracts) and Apprentices
//     (10 unique cards, one-shot or persistent lifecycle).
//   • Two worker piece types: apprentice (max 4 / player) + master (1 / player).
//     Pre-seed all 4 apprentices per player so Training Hall just attaches
//     existing detached pieces at runtime; no SDK piece-creation needed.
//   • Resources: wood, stone, coin.
//
// Per the rule.md table, item type for Order matching is derived from the
// item's primary resource cost at runtime; we do not encode item content in
// the topology manifest. Items live as runtime state on workshop-mat spaces.

export default defineTopologyManifest({
  players: {
    minPlayers: 2,
    maxPlayers: 2,
    optimalPlayers: 2,
  },

  resources: [
    { id: "wood", name: "Wood", icon: "🪵" },
    { id: "stone", name: "Stone", icon: "🪨" },
    { id: "coin", name: "Coin", icon: "🪙" },
  ],

  cardSets: [
    {
      type: "manual",
      id: "order-cards",
      name: "Order Cards",
      defaultHome: { type: "zone", zoneId: "order-deck" },
      cardSchema: {
        properties: {
          orderId: {
            type: "enum",
            enums: [
              "furniture-commission",
              "stone-sculpture",
              "masters-display",
              "forge-order",
              "weavers-request",
              "apprentice-trial",
              "mixed-set",
              "architects-plan",
              "row-of-pride",
              "grand-atelier",
            ],
          },
          rewardVP: { type: "integer" },
          rewardCoin: { type: "integer" },
        },
      },
      cards: [
        {
          type: "furniture-commission",
          name: "Furniture Commission",
          count: 1,
          properties: {
            orderId: "furniture-commission",
            rewardVP: 3,
            rewardCoin: 0,
          },
        },
        {
          type: "stone-sculpture",
          name: "Stone Sculpture",
          count: 1,
          properties: {
            orderId: "stone-sculpture",
            rewardVP: 3,
            rewardCoin: 0,
          },
        },
        {
          type: "masters-display",
          name: "Master's Display",
          count: 1,
          properties: {
            orderId: "masters-display",
            rewardVP: 4,
            rewardCoin: 2,
          },
        },
        {
          type: "forge-order",
          name: "Forge Order",
          count: 1,
          properties: {
            orderId: "forge-order",
            rewardVP: 5,
            rewardCoin: 0,
          },
        },
        {
          type: "weavers-request",
          name: "Weaver's Request",
          count: 1,
          properties: {
            orderId: "weavers-request",
            rewardVP: 4,
            rewardCoin: 0,
          },
        },
        {
          type: "apprentice-trial",
          name: "Apprentice Trial",
          count: 1,
          properties: {
            orderId: "apprentice-trial",
            rewardVP: 2,
            rewardCoin: 2,
          },
        },
        {
          type: "mixed-set",
          name: "Mixed Set",
          count: 1,
          properties: {
            orderId: "mixed-set",
            rewardVP: 3,
            rewardCoin: 1,
          },
        },
        {
          type: "architects-plan",
          name: "Architect's Plan",
          count: 1,
          properties: {
            orderId: "architects-plan",
            rewardVP: 6,
            rewardCoin: 0,
          },
        },
        {
          type: "row-of-pride",
          name: "Row of Pride",
          count: 1,
          properties: {
            orderId: "row-of-pride",
            rewardVP: 5,
            rewardCoin: 0,
          },
        },
        {
          type: "grand-atelier",
          name: "Grand Atelier",
          count: 1,
          properties: {
            orderId: "grand-atelier",
            rewardVP: 7,
            rewardCoin: 0,
          },
        },
      ],
    },
    {
      type: "manual",
      id: "apprentice-cards",
      name: "Apprentice Cards",
      defaultHome: { type: "zone", zoneId: "apprentice-deck" },
      cardSchema: {
        properties: {
          apprenticeId: {
            type: "enum",
            enums: [
              "quick-delivery",
              "lumber-stash",
              "stone-cache",
              "spare-hands",
              "inspiration",
              "reassign",
              "foreman",
              "tireless-master",
              "guild-scholar",
              "patrons-favor",
            ],
          },
          lifecycle: {
            type: "enum",
            enums: ["oneShot", "persistent"],
          },
        },
      },
      cards: [
        {
          type: "quick-delivery",
          name: "Quick Delivery",
          count: 1,
          properties: { apprenticeId: "quick-delivery", lifecycle: "oneShot" },
        },
        {
          type: "lumber-stash",
          name: "Lumber Stash",
          count: 1,
          properties: { apprenticeId: "lumber-stash", lifecycle: "oneShot" },
        },
        {
          type: "stone-cache",
          name: "Stone Cache",
          count: 1,
          properties: { apprenticeId: "stone-cache", lifecycle: "oneShot" },
        },
        {
          type: "spare-hands",
          name: "Spare Hands",
          count: 1,
          properties: { apprenticeId: "spare-hands", lifecycle: "oneShot" },
        },
        {
          type: "inspiration",
          name: "Inspiration",
          count: 1,
          properties: { apprenticeId: "inspiration", lifecycle: "oneShot" },
        },
        {
          type: "reassign",
          name: "Reassign",
          count: 1,
          properties: { apprenticeId: "reassign", lifecycle: "oneShot" },
        },
        {
          type: "foreman",
          name: "Foreman",
          count: 1,
          properties: { apprenticeId: "foreman", lifecycle: "persistent" },
        },
        {
          type: "tireless-master",
          name: "Tireless Master",
          count: 1,
          properties: {
            apprenticeId: "tireless-master",
            lifecycle: "persistent",
          },
        },
        {
          type: "guild-scholar",
          name: "Guild Scholar",
          count: 1,
          properties: {
            apprenticeId: "guild-scholar",
            lifecycle: "persistent",
          },
        },
        {
          type: "patrons-favor",
          name: "Patron's Favor",
          count: 1,
          properties: {
            apprenticeId: "patrons-favor",
            lifecycle: "persistent",
          },
        },
      ],
    },
  ],

  zones: [
    // ── Order deck flow ──
    {
      id: "order-deck",
      name: "Order Deck",
      scope: "shared",
      allowedCardSetIds: ["order-cards"],
      visibility: "hidden",
    },
    {
      id: "order-discard",
      name: "Order Discard",
      scope: "shared",
      allowedCardSetIds: ["order-cards"],
      visibility: "public",
    },
    {
      id: "order-hand",
      name: "Order Hand",
      scope: "perPlayer",
      allowedCardSetIds: ["order-cards"],
      visibility: "ownerOnly",
    },
    // ── Apprentice deck flow ──
    {
      id: "apprentice-deck",
      name: "Apprentice Deck",
      scope: "shared",
      allowedCardSetIds: ["apprentice-cards"],
      visibility: "hidden",
    },
    {
      id: "apprentice-discard",
      name: "Apprentice Discard",
      scope: "shared",
      allowedCardSetIds: ["apprentice-cards"],
      visibility: "public",
    },
    {
      id: "apprentice-hand",
      name: "Apprentice Hand",
      scope: "perPlayer",
      allowedCardSetIds: ["apprentice-cards"],
      visibility: "ownerOnly",
    },
    {
      id: "apprentice-tableau",
      name: "Apprentice Tableau",
      scope: "perPlayer",
      allowedCardSetIds: ["apprentice-cards"],
      visibility: "public",
    },
  ],

  boardTemplates: [
    {
      id: "action-board-template",
      name: "Action Board Template",
      layout: "square",
      // The action board is a 3×3 grid (9 active spaces). We declare all 12
      // candidates: 6 fixed + 6 variable-pool. Setup activates 9 (6 fixed + 3
      // variable). The unused variable spaces sit on the board template but
      // are inert at runtime (gated by an `active` runtime flag, not encoded
      // here — the topology manifest exposes the candidate set; the
      // setup/reducer chooses which are active).
      spaceFieldsSchema: {
        properties: {
          actionId: {
            type: "enum",
            enums: [
              "lumberyard",
              "quarry",
              "market",
              "guild-hall",
              "training-hall",
              "workshop",
              "masons-lodge",
              "trade-post",
              "patrons-estate",
              "forge",
              "library",
              "apothecary",
            ],
          },
          poolKind: {
            type: "enum",
            enums: ["fixed", "variable"],
          },
        },
      },
      spaces: [
        // Fixed spaces (6) — laid out in the first two rows.
        {
          id: "lumberyard",
          row: 0,
          col: 0,
          typeId: "fixed",
          fields: { actionId: "lumberyard", poolKind: "fixed" },
        },
        {
          id: "quarry",
          row: 0,
          col: 1,
          typeId: "fixed",
          fields: { actionId: "quarry", poolKind: "fixed" },
        },
        {
          id: "market",
          row: 0,
          col: 2,
          typeId: "fixed",
          fields: { actionId: "market", poolKind: "fixed" },
        },
        {
          id: "guild-hall",
          row: 1,
          col: 0,
          typeId: "fixed",
          fields: { actionId: "guild-hall", poolKind: "fixed" },
        },
        {
          id: "training-hall",
          row: 1,
          col: 1,
          typeId: "fixed",
          fields: { actionId: "training-hall", poolKind: "fixed" },
        },
        {
          id: "workshop",
          row: 1,
          col: 2,
          typeId: "fixed",
          fields: { actionId: "workshop", poolKind: "fixed" },
        },
        // Variable-pool candidate spaces (6) — bottom row plus one extra row.
        // Placement here is just for the on-board layout of any variable
        // spaces that get activated; runtime state controls which are active.
        {
          id: "masons-lodge",
          row: 2,
          col: 0,
          typeId: "variable",
          fields: { actionId: "masons-lodge", poolKind: "variable" },
        },
        {
          id: "trade-post",
          row: 2,
          col: 1,
          typeId: "variable",
          fields: { actionId: "trade-post", poolKind: "variable" },
        },
        {
          id: "patrons-estate",
          row: 2,
          col: 2,
          typeId: "variable",
          fields: { actionId: "patrons-estate", poolKind: "variable" },
        },
        {
          id: "forge",
          row: 3,
          col: 0,
          typeId: "variable",
          fields: { actionId: "forge", poolKind: "variable" },
        },
        {
          id: "library",
          row: 3,
          col: 1,
          typeId: "variable",
          fields: { actionId: "library", poolKind: "variable" },
        },
        {
          id: "apothecary",
          row: 3,
          col: 2,
          typeId: "variable",
          fields: { actionId: "apothecary", poolKind: "variable" },
        },
      ],
    },
    {
      id: "wake-up-track-template",
      name: "Wake-Up Track Template",
      layout: "square",
      spaceFieldsSchema: {
        properties: {
          slotIndex: { type: "integer" },
          turnOrder: {
            type: "enum",
            enums: ["first", "second"],
          },
          bonusKind: {
            type: "enum",
            enums: ["none", "coin", "apprentice-card", "wood-stone"],
          },
        },
      },
      spaces: [
        {
          id: "wake-up-1",
          row: 0,
          col: 0,
          typeId: "wake-up-slot",
          fields: { slotIndex: 1, turnOrder: "first", bonusKind: "none" },
        },
        {
          id: "wake-up-2",
          row: 0,
          col: 1,
          typeId: "wake-up-slot",
          fields: { slotIndex: 2, turnOrder: "first", bonusKind: "coin" },
        },
        {
          id: "wake-up-3",
          row: 0,
          col: 2,
          typeId: "wake-up-slot",
          fields: {
            slotIndex: 3,
            turnOrder: "second",
            bonusKind: "apprentice-card",
          },
        },
        {
          id: "wake-up-4",
          row: 0,
          col: 3,
          typeId: "wake-up-slot",
          fields: {
            slotIndex: 4,
            turnOrder: "second",
            bonusKind: "wood-stone",
          },
        },
      ],
    },
    {
      id: "workshop-mat-template",
      name: "Workshop Mat Template",
      layout: "square",
      // 4 columns × 3 rows = 12 cells. Items will be tracked at runtime by
      // attaching item state to cell spaceIds; no piece seeds required.
      spaces: [
        { id: "cell-r0-c0", row: 0, col: 0, typeId: "cell" },
        { id: "cell-r0-c1", row: 0, col: 1, typeId: "cell" },
        { id: "cell-r0-c2", row: 0, col: 2, typeId: "cell" },
        { id: "cell-r0-c3", row: 0, col: 3, typeId: "cell" },
        { id: "cell-r1-c0", row: 1, col: 0, typeId: "cell" },
        { id: "cell-r1-c1", row: 1, col: 1, typeId: "cell" },
        { id: "cell-r1-c2", row: 1, col: 2, typeId: "cell" },
        { id: "cell-r1-c3", row: 1, col: 3, typeId: "cell" },
        { id: "cell-r2-c0", row: 2, col: 0, typeId: "cell" },
        { id: "cell-r2-c1", row: 2, col: 1, typeId: "cell" },
        { id: "cell-r2-c2", row: 2, col: 2, typeId: "cell" },
        { id: "cell-r2-c3", row: 2, col: 3, typeId: "cell" },
      ],
    },
  ],

  boards: [
    {
      id: "action-board",
      name: "Action Board",
      layout: "square",
      scope: "shared",
      templateId: "action-board-template",
    },
    {
      id: "wake-up-track",
      name: "Wake-Up Track",
      layout: "square",
      scope: "shared",
      templateId: "wake-up-track-template",
    },
    {
      id: "workshop-mat",
      name: "Workshop Mat",
      layout: "square",
      scope: "perPlayer",
      templateId: "workshop-mat-template",
    },
  ],

  pieceTypes: [
    { id: "apprentice", name: "Apprentice" },
    { id: "master", name: "Master" },
  ],

  // Pre-seed each player's full max worker roster (4 apprentices + 1 master)
  // detached. Setup attaches 2 apprentices + 1 master to the player's
  // available roster; Training Hall attaches one of the remaining detached
  // apprentices at a season boundary.
  pieceSeeds: [
    {
      id: "apprentice-p1-1",
      typeId: "apprentice",
      ownerId: "player-1",
      home: { type: "detached" },
    },
    {
      id: "apprentice-p1-2",
      typeId: "apprentice",
      ownerId: "player-1",
      home: { type: "detached" },
    },
    {
      id: "apprentice-p1-3",
      typeId: "apprentice",
      ownerId: "player-1",
      home: { type: "detached" },
    },
    {
      id: "apprentice-p1-4",
      typeId: "apprentice",
      ownerId: "player-1",
      home: { type: "detached" },
    },
    {
      id: "master-p1",
      typeId: "master",
      ownerId: "player-1",
      home: { type: "detached" },
    },
    {
      id: "apprentice-p2-1",
      typeId: "apprentice",
      ownerId: "player-2",
      home: { type: "detached" },
    },
    {
      id: "apprentice-p2-2",
      typeId: "apprentice",
      ownerId: "player-2",
      home: { type: "detached" },
    },
    {
      id: "apprentice-p2-3",
      typeId: "apprentice",
      ownerId: "player-2",
      home: { type: "detached" },
    },
    {
      id: "apprentice-p2-4",
      typeId: "apprentice",
      ownerId: "player-2",
      home: { type: "detached" },
    },
    {
      id: "master-p2",
      typeId: "master",
      ownerId: "player-2",
      home: { type: "detached" },
    },
  ],

  dieTypes: [],
  dieSeeds: [],

  setupOptions: [],
  setupProfiles: [
    {
      id: "standard",
      name: "Standard",
      description:
        "Standard Artisans' Guild setup: 6 fixed action spaces + 3 randomly-drawn variable spaces.",
    },
    {
      id: "test-fixed-spaces",
      name: "Test fixed spaces",
      description:
        "Reducer-test profile that activates a deterministic set of 3 variable action spaces.",
    },
    {
      id: "test-end-game",
      name: "Test end-game",
      description:
        "Reducer-test profile that pre-seeds a near-end-of-season-6 state for scoring tests.",
    },
  ],
});
