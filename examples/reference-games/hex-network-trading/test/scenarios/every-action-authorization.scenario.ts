import { defineScenario } from "../testing-types.ts";

/**
 * Cross-cutting authorization regression. Enumerates every phase-kind
 * interaction surfaced by the SDK bundle and asserts the descriptor-level
 * authorization invariants every SDK game relies on.
 *
 * What this covers:
 *
 * 1. "Interactions without an interaction-level `actor` are gated by the
 *    phase actor."
 *    In the `playerTurn` phase the only active player is seat 0. So for
 *    every non-active seat and every non-actor-traild interaction
 *    (e.g. `rollDice`, `endTurn`, `offerTrade`), the descriptor must have
 *    `availability.status === "notYourTurn"`.
 *
 * 2. "Interactions with an interaction-level `actor` and
 *    `visibility: \"actorsOnly\"` are actor-traild and hidden from
 *    non-actors." Both `respondToTrade` and `discardCards` work this way:
 *    the descriptor list of a non-actor must NOT include them. For
 *    `respondToTrade` this is
 *    how the trade inbox avoids false positives; for `discardCards` it's
 *    how the forced-discard blocker stays scoped to the seats that must
 *    discard.
 *
 * 3. "An offer opens the response action; closing it re-hides it." Before
 *    the offer NO seat sees `respondToTrade` (`actor` resolves to empty).
 *    After the offer the descriptor appears for exactly the named actors
 *    with `availability.status === "available"` (this is the NOT_YOUR_TURN bug the SDK fix
 *    addressed). A companion scenario, `trade-full-lifecycle`, confirms
 *    the descriptor disappears again once `pendingTrade` clears.
 */
export default defineScenario({
  id: "every-action-authorization",
  description:
    "Every phase interaction's descriptor reports the correct authorization for each seat",
  from: "after-setup",
  when: async ({ game, view, seat }) => {
    const offerer = seat(0);
    await game.submit(offerer, "rollDice", {});

    // Offer a trade we know is feasible at this seed — probing resources
    // dynamically in case setup grants change in the future.
    const p1Resources = (
      view(offerer) as { myResources: Record<string, number> }
    ).myResources;
    const giveResource = Object.entries(p1Resources).find(
      ([, count]) => count > 0,
    )?.[0];
    if (!giveResource) {
      throw new Error(
        "after-setup did not grant seat 0 any resources; cannot exercise trade authorization.",
      );
    }

    await game.submit(offerer, "offerTrade", {
      give: { [giveResource]: 1 },
      want: { clay: 1 },
      targetPlayerIds: [seat(1), seat(2)],
    });
  },
  then: ({ expect, interactions, explain, seat }) => {
    const allSeats = [seat(0), seat(1), seat(2), seat(3)] as const;
    const activePlayer = seat(0);
    const responseActors = new Set<string>([seat(1), seat(2)]);

    // Walk every descriptor for every seat and cross-check the expected
    // authorization decision.
    //
    // Terminology (authored in `@dreamboard-games/sdk/reducer`):
    //   - "phase-actor gated" — no interaction-level `actor`. Gated by the
    //     current turn's phase actor. Non-active players see the descriptor
    //     marked `availability.status === "notYourTurn"`.
    //   - "interaction-actor traild" — has an interaction-level `actor`.
    //     Only the actors see the descriptor at all. Non-actors
    //     (INCL. the active player, if they are not in the actor
    //     set) see nothing. In this scenario `respondToTrade` is
    //     actor-traild with `{seat1, seat2}` as actors.
    //     `discardCards` is also actor-traild but its actor set
    //     is empty (no one rolled a 7), so it is hidden from everyone.
    for (const currentSeat of allSeats) {
      const descriptors = interactions(currentSeat);

      for (const descriptor of descriptors) {
        if (descriptor.interactionId === "respondToTrade") {
          // Actor-traild action: visible ONLY to seats 1 and 2, with
          // `availability.status === "available"`.
          expect(descriptor.kind).toBe("action");
          expect(responseActors.has(currentSeat)).toBe(true);
          expect(descriptor).toBeAvailable(
            explain(currentSeat, "respondToTrade"),
          );
          continue;
        }

        if (descriptor.interactionId === "discardCards") {
          // Actor-traild action with an empty actor set — the
          // descriptor must be suppressed for every seat. If we see one
          // actor visibility has regressed.
          throw new Error(
            `Seat ${currentSeat} received a discardCards descriptor but no one needs to discard — ` +
              `actor-traild interactions with an empty actor set must be hidden.`,
          );
        }

        // Everything else is phase-actor gated.
        // The active seat may or may not be available depending on the
        // author's `available` predicate, but it must never be gated by
        // "Not your turn". Non-active seats must be uniformly blocked
        // by "Not your turn".
        expect(descriptor.kind).toBe("action");
        if (currentSeat === activePlayer) {
          if (descriptor.availability.status === "notYourTurn") {
            throw new Error(
              `Active player ${currentSeat} sees ${descriptor.interactionId} gated by "Not your turn" — ` +
                `active-player-gated interactions must never block the active player.`,
            );
          }
        } else {
          const availability = descriptor.availability;
          expect(availability.status).toBe("notYourTurn");
          if (availability.status !== "notYourTurn") {
            throw new Error("Expected notYourTurn availability.");
          }
          expect(availability.reason).toBe("Not your turn");
        }
      }

      // Coverage check: actors see `respondToTrade`, non-actors
      // do NOT see it. Symmetric to the per-descriptor walk above — the
      // two together lock down the descriptor set as a whole.
      const respond = descriptors.find(
        (d) => d.interactionId === "respondToTrade",
      );
      if (responseActors.has(currentSeat)) {
        expect(respond).toBeDefined();
      } else {
        expect(respond).toBeUndefined();
      }

      // Coverage check: `discardCards` is actor-traild via
      // `actor: state.phase.discardPending`, and at this snapshot nobody
      // has rolled a 7, so the actor set resolves to `[]`. Every seat —
      // including the active player — must have it hidden.
      const discard = descriptors.find(
        (d) => d.interactionId === "discardCards",
      );
      expect(discard).toBeUndefined();
    }

    const activeDescriptors = interactions(activePlayer);
    const offerTrade = activeDescriptors.find(
      (d) => d.interactionId === "offerTrade",
    );
    expect(
      offerTrade?.inputs.find((input) => input.key === "targetPlayerIds")
        ?.domain.type,
    ).toBe("choiceList");

    const confirmTrade = activeDescriptors.find(
      (d) => d.interactionId === "confirmTrade",
    );
    expect(
      confirmTrade?.inputs.find((input) => input.key === "partnerId")?.domain
        .type,
    ).toBe("choice");
  },
});
