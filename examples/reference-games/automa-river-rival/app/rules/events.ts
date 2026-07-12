import { gameEvent, type GameEvent } from "@dreamboard-games/sdk/reducer";
import type { ProcedureEvent } from "../game-contract";

export function procedureGameEvent(event: ProcedureEvent): GameEvent {
  switch (event.kind) {
    case "rival-instruction-revealed":
      return gameEvent.systemAction({
        procedureId: event.kind,
        title: "Rival instruction revealed",
        summary: event.instructionId,
        details: [
          { label: "Round", value: event.round },
          { label: "Instruction", value: event.instructionKind },
          ...(event.cargoKind
            ? [{ label: "Cargo kind", value: event.cargoKind }]
            : []),
        ],
      });
    case "rival-cargo-claimed":
      return gameEvent.systemAction({
        procedureId: event.kind,
        title: "Rival cargo claimed",
        summary: event.cargoId,
        details: [
          { label: "Position", value: event.position },
          { label: "Printed value", value: event.value },
          { label: "Rival progress", value: event.rivalProgress },
        ],
      });
    case "rival-river-swept":
      return gameEvent.systemAction({
        procedureId: event.kind,
        title: "River swept",
        summary: event.cargoId,
        details: [
          { label: "Position", value: event.position },
          { label: "Progress gain", value: event.progressGain },
          { label: "Rival progress", value: event.rivalProgress },
        ],
      });
    case "river-refilled":
      return gameEvent.systemAction({
        procedureId: event.kind,
        title: "River refilled",
        summary: event.cargoId,
        details: [
          { label: "Position", value: event.position },
          { label: "Source", value: event.source },
          ...(event.playerId
            ? [{ label: "Human", value: event.playerId }]
            : []),
        ],
      });
    case "river-round-advanced":
      return gameEvent.systemAction({
        procedureId: event.kind,
        title: "River round advanced",
        summary:
          event.nextRound === null
            ? "The six-round contest is complete."
            : `Round ${event.nextRound} begins.`,
        details: [
          { label: "Completed round", value: event.completedRound },
          {
            label: "Next round",
            value: event.nextRound ?? "complete",
          },
        ],
      });
  }
}
