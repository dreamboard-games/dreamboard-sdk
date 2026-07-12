import type { RiverCargoCardId } from "../../shared/manifest-contract";
import type { GameContract, ProcedureEvent } from "../game-contract";
import { resolveRivalPhaseStateSchema } from "../game-contract";
import {
  cargoCard,
  chooseRivalCargoIndex,
  rivalInstruction,
  withRiverOrder,
} from "../rules/cards";
import { procedureGameEvent } from "../rules/events";
import { definePhase } from "@dreamboard-games/sdk/reducer";

export const resolveRival = definePhase<GameContract>()({
  kind: "auto",
  state: resolveRivalPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, edit, fx, q }) {
    const instructionId = q.zone.sharedCards("instruction-deck")[0];
    if (!instructionId) {
      throw new Error("River Guild instruction deck exhausted early.");
    }
    const instruction = rivalInstruction(q, instructionId);
    const riverIds = q.zone.sharedCards("river");
    const river = riverIds.map((cardId) => cargoCard(q, cardId));
    const position = chooseRivalCargoIndex(river, instruction);
    const selected = river[position]!;
    const progressGain =
      instruction.instructionKind === "sweepLeft" ? 1 : selected.value;
    const nextProgress = state.publicState.rivalProgress + progressGain;

    const tx = edit(state);
    tx.moveCardBetweenSharedZones({
      fromZoneId: "instruction-deck",
      toZoneId: "instruction-history",
      cardId: instructionId,
    });
    tx.moveCardBetweenSharedZones({
      fromZoneId: "river",
      toZoneId:
        instruction.instructionKind === "sweepLeft"
          ? "rival-discarded"
          : "rival-claimed",
      cardId: selected.id,
    });
    const replacementId = tx.q.zone.sharedCards("cargo-deck")[0];
    if (!replacementId) {
      throw new Error("River Guild cargo deck exhausted before rival refill.");
    }
    tx.moveCardBetweenSharedZones({
      fromZoneId: "cargo-deck",
      toZoneId: "river",
      cardId: replacementId,
    });
    const nextRiver = [...riverIds] as RiverCargoCardId[];
    nextRiver[position] = replacementId;
    const orderedState = withRiverOrder(tx.state, nextRiver);

    const revealedEvent: ProcedureEvent = {
      kind: "rival-instruction-revealed",
      round: state.publicState.round,
      instructionId,
      instructionKind: instruction.instructionKind,
      ...(instruction.cargoKind ? { cargoKind: instruction.cargoKind } : {}),
    };
    const resolutionEvent: ProcedureEvent =
      instruction.instructionKind === "sweepLeft"
        ? {
            kind: "rival-river-swept",
            round: state.publicState.round,
            cargoId: selected.id,
            cargoKind: selected.cargoKind,
            value: selected.value,
            position: 0,
            progressGain: 1,
            rivalProgress: nextProgress,
          }
        : {
            kind: "rival-cargo-claimed",
            round: state.publicState.round,
            cargoId: selected.id,
            cargoKind: selected.cargoKind,
            value: selected.value,
            position,
            rivalProgress: nextProgress,
          };
    const refillEvent: ProcedureEvent = {
      kind: "river-refilled",
      round: state.publicState.round,
      cargoId: replacementId,
      position,
      source: "rival",
    };
    const procedureEvents = [revealedEvent, resolutionEvent, refillEvent];
    const nextTx = edit(orderedState);
    nextTx.patchPublicState({
      rivalProgress: nextProgress,
      procedureEvents: [
        ...state.publicState.procedureEvents,
        ...procedureEvents,
      ],
    });
    return accept(nextTx.state, {
      events: procedureEvents.map(procedureGameEvent),
      instructions: [fx.transition("advanceRiverRound")],
    });
  },
});
