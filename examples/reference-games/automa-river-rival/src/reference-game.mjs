import { DREAMBOARD_SDK_PACKAGE_SET } from "@dreamboard-games/sdk/package-set";
import coverage from "../scenarios/coverage.json" with { type: "json" };

export const riverCards = [
  { id: "timber-1-1", kind: "timber", value: 1 },
  { id: "ore-2-1", kind: "ore", value: 2 },
  { id: "grain-3-1", kind: "grain", value: 3 },
  { id: "timber-3-1", kind: "timber", value: 3 },
];

export const rivalInstructions = [
  { id: "claim-highest-1", kind: "claimHighest" },
  { id: "claim-kind-ore-1", kind: "claimKind", cargoKind: "ore" },
  { id: "sweep-left-1", kind: "sweepLeft" },
];

export function createInitialState() {
  return {
    phase: "humanTurn",
    playerIds: ["player-1"],
    riverCards,
    rivalDeck: rivalInstructions.map((instruction) => instruction.id),
    rivalProgress: 0,
    teamScore: 0,
    events: [],
    completed: false,
    terminal: null,
  };
}

function highestCargo(cards) {
  return [...cards].sort((left, right) => {
    if (right.value !== left.value) return right.value - left.value;
    return left.id.localeCompare(right.id);
  })[0];
}

function instructionById(id) {
  return rivalInstructions.find((instruction) => instruction.id === id);
}

export function resolveRival(state) {
  const [instructionId, ...remainingDeck] = state.rivalDeck;
  const instruction = instructionById(instructionId);
  const claimed =
    instruction?.kind === "claimKind"
      ? (state.riverCards.find((card) => card.kind === instruction.cargoKind) ??
        state.riverCards[0])
      : highestCargo(state.riverCards);
  const events = [
    {
      kind: "systemAction",
      procedureId: "rival-instruction-revealed",
      title: "Rival instruction revealed",
      summary: instruction?.kind ?? "claimHighest",
    },
    {
      kind: "systemAction",
      procedureId: "rival-cargo-claimed",
      title: "Rival cargo claimed",
      summary: claimed.id,
    },
    {
      kind: "systemAction",
      procedureId: "river-refilled",
      title: "River refilled",
      summary: "The river market refilled deterministically.",
    },
    {
      kind: "systemAction",
      procedureId: "river-round-advanced",
      title: "Round advanced",
      summary: "Control returns to the human player.",
    },
  ];
  return {
    ...state,
    rivalDeck: remainingDeck,
    riverCards: state.riverCards.filter((card) => card.id !== claimed.id),
    rivalProgress: state.rivalProgress + claimed.value,
    events: [...state.events, ...events],
  };
}

export function claimCargo(state, { playerId = "player-1" } = {}) {
  if (playerId !== "player-1") {
    return {
      accepted: false,
      state,
      validation: {
        ok: false,
        errorCode: "PLAYER_NOT_AUTHORIZED",
        message: "Only the human player may claim cargo.",
      },
    };
  }
  return {
    accepted: true,
    state: resolveRival({
      ...state,
      teamScore: state.teamScore + 2,
    }),
    validation: { ok: true },
  };
}

const initial = createInitialState();
const claimHighest = claimCargo(initial);

export const scenarioMetadata = {
  claimHighest: {
    initial,
    result: claimHighest,
  },
  seedRepeat: {
    first: claimCargo(createInitialState()),
    second: claimCargo(createInitialState()),
  },
};

export const referenceGame = {
  id: "automa-river-rival",
  displayName: "Automa River Rival",
  rulesBrief: "River Guild",
  sdkPackageSetVersion: DREAMBOARD_SDK_PACKAGE_SET.sdkVersion,
  coverage,
  players: { min: 1, max: 1 },
  guidance: {
    phase: {
      id: "humanTurn",
      label: "Claim cargo",
      summary:
        "Claim cargo for the team, then resolve deterministic rival actions.",
      objective: "Outscore the river rival without assigning it a player seat.",
    },
    setup: {
      profileId: "standard",
      name: "River Guild setup",
      summary:
        "One human player shares a public river with a deterministic rival deck.",
      steps: [
        {
          id: "deal-river",
          label: "Deal river",
          description: "Place four cargo cards in the public river market.",
        },
        {
          id: "seed-rival",
          label: "Seed rival",
          description: "Prepare the deterministic rival instruction deck.",
        },
      ],
    },
  },
  interactions: [
    {
      id: "claim-cargo",
      label: "Claim cargo",
      help: "Claim one cargo, then let the reducer resolve the rival procedure.",
    },
  ],
  systemProcedures: [
    "rival-instruction-revealed",
    "rival-cargo-claimed",
    "river-refilled",
    "river-round-advanced",
  ],
};

if (
  typeof process !== "undefined" &&
  process.argv[1]?.endsWith("reference-game.mjs")
) {
  console.log(
    JSON.stringify({
      id: referenceGame.id,
      sdkPackageSetVersion: referenceGame.sdkPackageSetVersion,
      interactions: referenceGame.interactions.length,
      procedures: referenceGame.systemProcedures.length,
    }),
  );
}
