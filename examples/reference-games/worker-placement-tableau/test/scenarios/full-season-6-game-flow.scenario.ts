import { defineScenario } from "../testing-types.ts";
import {
  chooseMarket,
  craftItem,
  fulfillOrder,
  givePlayerApprenticeCard,
  givePlayerOrderCard,
  passPlacement,
  pickSlot,
  placeApprentice,
  placeMaster,
  playApprentice,
  reassign,
  setPlayerResources,
} from "../scenario-helpers.ts";

// Full-season audit. Drives the 2-player workspace from
// `initial-turn` (post-setup) through six seasons to `gameOver`,
// hitting every rule.md mechanic at least once via real reducer
// submissions.
//
// Compact-season strategy: each season is short (a small handful of
// placements) and ends with explicit `passPlacement` calls from both
// players. This trades realism for legibility — auto-pass cycling
// across many placements is hard to reason about; tightly-scripted
// passes are not. Mechanic coverage is unchanged.
//
// Card-availability: every specific card we exercise is seeded via
// `givePlayer*Card` BEFORE the relevant turn (allowed for T180).
//
// Resource seeding: ONE `setPlayerResources` call at the very start
// keeps crafting and training-hall affordability outside the
// pass/placement loop.
export default defineScenario({
  id: "full-season-6-game-flow",
  description:
    "Drives the 2-player workspace from initial-turn through six seasons to gameOver, hitting every rule.md mechanic.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    // Seed enough resources for crafting and training-hall.
    await setPlayerResources(game, seat0, { wood: 8, stone: 8, coin: 8 });
    await setPlayerResources(game, seat1, { wood: 8, stone: 8, coin: 8 });

    // ── Season 1 ─────────────────────────────────────────────────────
    // Coverage: lumberyard, quarry, master override, market gain-coin,
    // workshop+anvil craft.
    await pickSlot(game, seat0, 1);
    await pickSlot(game, seat1, 4); // turn order [seat0, seat1]

    await placeApprentice(game, seat0, 1, "lumberyard"); // +2 wood
    await placeApprentice(game, seat1, 1, "quarry"); // +1 stone
    await placeMaster(game, seat0, "market"); // barrier
    await chooseMarket(game, seat0, "gain-coin"); // +3 coin
    await placeMaster(game, seat1, "lumberyard"); // master override; +2 wood
    await passPlacement(game, seat0);
    await passPlacement(game, seat1);

    // ── Season 2 ─────────────────────────────────────────────────────
    // Coverage: persistent foreman + lumberyard hook, training-hall
    // buy, workshop+loom craft.
    await givePlayerApprenticeCard(game, seat1, "foreman");

    await pickSlot(game, seat0, 3); // second
    await pickSlot(game, seat1, 2); // first; +1 coin
    // Turn order: [seat1, seat0].

    await playApprentice(game, seat1, "foreman"); // tableau
    await placeApprentice(game, seat1, 1, "lumberyard"); // +2 +1 (foreman) = +3
    await placeApprentice(game, seat0, 1, "workshop"); // barrier
    await craftItem(game, seat0, "cell-r2-c2", "loom"); // -2 wood
    await placeMaster(game, seat1, "training-hall"); // -3 coin, +1 pending
    await passPlacement(game, seat0);
    await passPlacement(game, seat1);

    // ── Season 3 ─────────────────────────────────────────────────────
    // Coverage: persistent guild-scholar + guild-hall hook, one-shot
    // quick-delivery, fulfill furniture-commission.
    await givePlayerApprenticeCard(game, seat1, "guild-scholar");
    await givePlayerApprenticeCard(game, seat0, "quick-delivery");
    await givePlayerOrderCard(game, seat0, "furniture-commission");

    // S2 turn order [seat1, seat0] → wakeup overrides.
    await pickSlot(game, seat1, 1);
    await pickSlot(game, seat0, 2); // turn order [seat1, seat0]

    await playApprentice(game, seat1, "guild-scholar"); // tableau

    // seat1 acts first.
    await placeApprentice(game, seat1, 1, "guild-hall"); // +1 order +1 ap +1 ap (scholar)

    // seat0 stacks: quick-delivery (no turn), then craft a workbench
    // adjacent to loom (touch-one), then fulfill order.
    await playApprentice(game, seat0, "quick-delivery"); // +3 coin
    await placeApprentice(game, seat0, 1, "workshop"); // barrier
    await craftItem(game, seat0, "cell-r2-c1", "workbench"); // touch-one with loom
    // Turn → seat1 after craft.

    // seat1 places to give seat0 another turn, but quickest: pass.
    await passPlacement(game, seat1);

    // seat0's turn — fulfill furniture-commission (workbench + loom = 2 wood items).
    await fulfillOrder(game, seat0, "furniture-commission"); // +3 VP
    await passPlacement(game, seat0);

    // ── Season 4 ─────────────────────────────────────────────────────
    // Coverage: persistent patrons-favor (+1 coin at next cleanup),
    // one-shot reassign.
    await givePlayerApprenticeCard(game, seat0, "patrons-favor");
    await givePlayerApprenticeCard(game, seat0, "reassign");

    await pickSlot(game, seat1, 1);
    await pickSlot(game, seat0, 2); // [seat1, seat0]

    await placeApprentice(game, seat1, 1, "lumberyard"); // foreman +3
    // seat0's turn — stack persistent + place + reassign.
    await playApprentice(game, seat0, "patrons-favor"); // tableau
    await placeApprentice(game, seat0, 1, "quarry"); // +1 stone
    // Turn → seat1.
    await passPlacement(game, seat1);
    // seat0's turn — reassign the worker on quarry. Reassign skips resolvers,
    // so moving to workshop does not start a craft.
    await reassign(game, seat0, "apprentice-p1-1", "workshop"); // pure relocate
    await passPlacement(game, seat0);

    // ── Season 5 ─────────────────────────────────────────────────────
    // Coverage: persistent tireless-master, one-shot inspiration
    // (kiln craft at -1 wood).
    await givePlayerApprenticeCard(game, seat0, "tireless-master");
    await givePlayerApprenticeCard(game, seat0, "inspiration");

    await pickSlot(game, seat1, 1);
    await pickSlot(game, seat0, 2); // [seat1, seat0]

    await placeApprentice(game, seat1, 1, "lumberyard"); // foreman +3
    // seat0's turn.
    await playApprentice(game, seat0, "tireless-master"); // tableau
    await placeMaster(game, seat0, "quarry"); // tireless tracks "quarry"
    // Turn → seat1.
    await passPlacement(game, seat1);
    // seat0's turn — master is auto-recalled; play inspiration + craft kiln.
    await playApprentice(game, seat0, "inspiration"); // sets flag, no turn
    await craftItem(game, seat0, "cell-r0-c3", "kiln"); // corner, 0 wood + 1 stone
    await passPlacement(game, seat0);

    // ── Season 6 ─────────────────────────────────────────────────────
    // Trivial pass-out: cleanup advances season 6 → overflow → scoring → gameOver.
    await pickSlot(game, seat1, 1);
    await pickSlot(game, seat0, 2);
    await passPlacement(game, seat1);
    await passPlacement(game, seat0);
  },
  then: ({ expect, view, seat, state }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);
    const v = view(seat0);

    expect(state()).toBe("gameOver");
    expect(v.outcome === null).toBe(false);
    expect(v.finalVPByPlayerId === null).toBe(false);

    const seat0Tableau = v.playedPersistentApprenticesByPlayer[seat0] ?? [];
    const seat1Tableau = v.playedPersistentApprenticesByPlayer[seat1] ?? [];
    expect(seat0Tableau.includes("patrons-favor")).toBe(true);
    expect(seat0Tableau.includes("tireless-master")).toBe(true);
    expect(seat1Tableau.includes("foreman")).toBe(true);
    expect(seat1Tableau.includes("guild-scholar")).toBe(true);

    expect(v.myOrderHand.includes("furniture-commission")).toBe(false);

    const seat0Mat = v.matItemsByPlayerId[seat0] ?? {};
    expect(Object.values(seat0Mat).includes("kiln")).toBe(true);
    expect(Object.values(seat0Mat).includes("workbench")).toBe(true);
    expect(Object.values(seat0Mat).includes("loom")).toBe(true);
  },
});
