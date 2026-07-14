import { defineScenario } from "../testing-types.ts";
import { claim } from "./commands.ts";

type ClaimCommand = ReturnType<typeof claim>;

export function defineRivalBranchScenario(options: {
  readonly id: string;
  readonly seed: number;
  readonly commands: readonly ClaimCommand[];
  readonly round: number;
  readonly reveal: Record<string, unknown>;
  readonly resolution: Record<string, unknown>;
}) {
  return defineScenario({
    id: options.id,
    description: `A legal seeded river path proves ${options.id.split("rival-instruction-")[1]}.`,
    setup: {
      players: 1,
      seed: options.seed,
      setupProfileId: "standard",
    },
    given: options.commands.slice(0, -1),
    when: options.commands.slice(-1),
    then: ({ expect, state }) => {
      const events = state().publicState.procedureEvents;
      const reveal = events.find(
        (event) =>
          event.kind === "rival-instruction-revealed" &&
          event.round === options.round,
      );
      const resolution = events.find(
        (event) =>
          (event.kind === "rival-cargo-claimed" ||
            event.kind === "rival-river-swept") &&
          event.round === options.round,
      );
      expect(reveal).toEqual(options.reveal);
      expect(resolution).toEqual(options.resolution);
      expect(
        events.filter(
          (event) =>
            event.kind === "rival-instruction-revealed" &&
            event.round === options.round,
        ),
      ).toHaveLength(1);
    },
  });
}
