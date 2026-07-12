import { defineStepPhase } from "@dreamboard-games/sdk/reducer";
import type { GameContract } from "../../game-contract";
import { sketchbookPhaseStateSchema } from "../../game-contract";
import {
  brainstorm,
  eraser,
  gallery,
  resolveEraser,
  resolveStudioVisit,
  studio,
  studioVisit,
} from "../../cards";
import {
  shuffleDeckForDraw,
  shuffleOpeningDeck,
} from "../../effects/deck";
import { buyCard, endActionStep, endTurn, playInspiration } from "./interactions";
import { FRESH_TURN } from "./state";

export const playerTurn = defineStepPhase<GameContract>()({
  kind: "player",
  steps: ["action", "resolve", "buy"],
  state: sketchbookPhaseStateSchema,
  initialState: () => ({ ...FRESH_TURN }),
  actor: ({ state }) => state.flow.activePlayers,
  zones: ["hand", "deck", "discard", "in-play"],
  cardActions: {
    brainstorm: { steps: ["action"], action: brainstorm },
    studio: { steps: ["action"], action: studio },
    gallery: { steps: ["action"], action: gallery },
    eraser: { steps: ["action"], action: eraser },
    studioVisit: { steps: ["action"], action: studioVisit },
  },
  interactions: {
    resolveEraser: { steps: ["resolve"], interaction: resolveEraser },
    resolveStudioVisit: {
      steps: ["resolve"],
      interaction: resolveStudioVisit,
    },
    endActionStep: { steps: ["action"], interaction: endActionStep },
    playInspiration: { steps: ["buy"], interaction: playInspiration },
    buyCard: { steps: ["buy"], interaction: buyCard },
    endTurn: { steps: ["buy"], interaction: endTurn },
  },
  effects: { shuffleOpeningDeck, shuffleDeckForDraw },
});
