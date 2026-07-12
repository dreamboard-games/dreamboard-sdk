import {
  boardInput,
  boardTarget,
  defineInputs,
  defineInteraction,
  definePhase,
} from "@dreamboard-games/sdk/reducer";
import {
  markSurveyPhaseStateSchema,
  type GameContract,
  type GameState,
} from "../game-contract";
import { activePlayerId, legalSurveyTargets, submitSurveyMark } from "../model";
import { edit } from "../reducer-support";
import type { SpaceId } from "../../shared/manifest-contract";

const surveyCellTarget = boardTarget
  .playerSpace<GameState, "survey-grid", SpaceId>("survey-grid")
  .where({
    id: "active-player",
    errorCode: "PLAYER_NOT_ACTIVE",
    message: "Players resolve the shared weather reading in seat order.",
    test: ({ state, playerId, target }) =>
      target.playerId === playerId &&
      activePlayerId(state.publicState) === playerId,
  })
  .where({
    id: "unmarked-survey-cell",
    errorCode: "CELL_ALREADY_MARKED",
    message: "Choose an unmarked survey-grid cell.",
    test: ({ state, playerId, target }) =>
      state.publicState.marks[playerId]?.[target.spaceId] === undefined,
  })
  .where({
    id: "legal-survey-cell",
    errorCode: "CELL_DOES_NOT_MATCH_ROLL",
    message: "Choose an unmarked cell matching the weather reading.",
    test: ({ state, playerId, target }) =>
      legalSurveyTargets(state.publicState, playerId).includes(target.spaceId),
  })
  .build();

const markCell = defineInteraction<
  GameContract,
  typeof markSurveyPhaseStateSchema
>()({
  inputs: defineInputs((input) => ({
    cell: input.add(
      "cell",
      boardInput.playerSpace({ target: surveyCellTarget }),
    ),
  })),
  reduce({ state, input, accept, reject, endGame, fx }) {
    const result = submitSurveyMark(state.publicState, {
      playerId: input.playerId,
      cellId: input.params.cell.spaceId,
      expectedRound: state.publicState.round,
    });
    if (!result.accepted) {
      const validation = result.validation as {
        errorCode:
          | "CELL_ALREADY_MARKED"
          | "CELL_DOES_NOT_MATCH_ROLL"
          | "PHASE_NOT_MARKING"
          | "PLAYER_NOT_ACTIVE"
          | "STALE_SUBMISSION"
          | "UNKNOWN_CELL";
        message: string;
      };
      return reject(validation.errorCode, validation.message);
    }

    const tx = edit(state);
    tx.patchPublicState(result.state);
    if (result.state.completed) {
      tx.setActivePlayers([]);
      if (!result.state.outcome) {
        throw new Error("Completed Cloudline state requires an outcome.");
      }
      return endGame(tx.state, result.state.outcome, {
        instructions: [fx.transition("gameOver")],
      });
    }

    if (result.state.roll === null) {
      tx.setActivePlayers([]);
      return accept(tx.state, { instructions: [fx.transition("roll")] });
    }

    const nextActive = activePlayerId(result.state);
    tx.setActivePlayers(nextActive ? [nextActive] : []);
    return accept(tx.state);
  },
});

export const markSurvey = definePhase<GameContract>()({
  kind: "player",
  state: markSurveyPhaseStateSchema,
  initialState: () => ({}),
  actor: ({ state }) => activePlayerId(state.publicState),
  interactions: {
    markCell,
  },
});
