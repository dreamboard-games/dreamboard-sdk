import { defineStepPhase } from "@dreamboard-games/sdk/reducer";
import {
  playerTurnPhaseStateSchema,
  type GameContract,
} from "../../game-contract";
import {
  brainstorm,
  studio,
  gallery,
  openMic,
  critic,
  eraser,
  resolveEraser,
  sketchpad,
  resolveSketchpad,
  studioVisit,
  resolveStudioVisit,
} from "../../cards";
import {
  shuffleOpeningDeck,
  shufflePlayerDeckForDraw,
} from "../../effects/deck";
import { FRESH_TURN } from "./state";
import {
  buyCard,
  endActionPhase,
  endTurn,
  playAllTreasures,
  playTreasure,
} from "./interactions";

export const playerTurn = defineStepPhase<GameContract>()({
  kind: "player",
  steps: ["action", "resolve", "buy", "cleanup"],
  state: playerTurnPhaseStateSchema,
  initialState: () => ({ ...FRESH_TURN }),
  actor: ({ state }) => state.flow.activePlayers,
  zones: ["hand", "deck", "discard"],
  cardActions: {
    brainstorm: { steps: ["action"], action: brainstorm },
    studio: { steps: ["action"], action: studio },
    gallery: { steps: ["action"], action: gallery },
    openMic: { steps: ["action"], action: openMic },
    critic: { steps: ["action"], action: critic },
    eraser: { steps: ["action"], action: eraser },
    sketchpad: { steps: ["action"], action: sketchpad },
    studioVisit: { steps: ["action"], action: studioVisit },
  },
  interactions: {
    endActionPhase: { steps: ["action"], interaction: endActionPhase },
    // Resolve interactions are offered only during the "resolve" step, gated
    // further to the matching `pendingAction.kind` by each interaction's
    // `available()` rule so exactly one is shown at a time.
    resolveEraser: { steps: ["resolve"], interaction: resolveEraser },
    resolveSketchpad: { steps: ["resolve"], interaction: resolveSketchpad },
    resolveStudioVisit: {
      steps: ["resolve"],
      interaction: resolveStudioVisit,
    },
    playTreasure: { steps: ["buy"], interaction: playTreasure },
    playAllTreasures: { steps: ["buy"], interaction: playAllTreasures },
    buyCard: { steps: ["buy"], interaction: buyCard },
    endTurn: { steps: ["buy"], interaction: endTurn },
  },
  effects: {
    // Reducer effects are registered on the interactive phase; setup emits
    // `shuffleOpeningDeck` before transitioning into this turn phase.
    shuffleOpeningDeck,
    shufflePlayerDeckForDraw,
  },
});
