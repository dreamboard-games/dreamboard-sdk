import { createGame } from "@dreamboard-games/sdk/reducer";
import { z } from "zod";
const suits = ["hearts", "spades", "clubs", "diamonds"] as const;
const ranks = ["2", "3", "4", "5"] as const;
const model = createGame({
  manifest: {
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [
      {
        id: "cards",
        name: "Cards",
        cardSchema: {
          properties: {
            suit: { type: "enum", enums: [...suits] },
            rank: { type: "enum", enums: [...ranks] },
          },
        },
        cards: suits.flatMap((suit) =>
          ranks.map((rank) => ({
            id: `${suit}-${rank}`,
            cardType: "card",
            name: `${rank} of ${suit}`,
            count: 1,
            properties: { suit, rank },
          })),
        ),
        defaultHome: { type: "zone", zoneId: "deck" },
      },
    ],
    zones: [
      { id: "deck", name: "Deck", scope: "shared", visibility: "hidden" },
      { id: "hand", name: "Hand", scope: "perPlayer", visibility: "ownerOnly" },
      { id: "table", name: "Table", scope: "shared", visibility: "public" },
      { id: "discard", name: "Discard", scope: "shared", visibility: "public" },
    ],
  },
  phases: { play: z.object({}) },
  state: {
    public: z.object({}),
    private: z.object({}),
    hidden: z.object({}),
  },
});
const play = model.phase("play");
/** A hand card of these suits. */
const handCard = (accepted: readonly string[]) =>
  play.inputs.card({
    from: ["hand"],
    where: {
      id: `suit-${accepted.join("-")}`,
      errorCode: "WRONG_SUIT",
      message: "That suit cannot go there.",
      test: ({ q, targetId }) =>
        accepted.includes(String(q.card.get(targetId).properties.suit)),
    },
  });
/**
 * A dealt hand where hearts only play, spades play or discard, clubs only
 * discard and diamonds do nothing: one card per action-menu case. Ending the
 * turn passes it to the other player.
 */
export const handGame = model.assemble({
  initial: { public: () => ({}) },
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      enter({ tx, q }) {
        const [first, second] = q.player.order();
        tx.shuffle({ zoneId: "deck" });
        tx.deal({
          fromZoneId: "deck",
          playerId: first,
          toZoneId: "hand",
          count: 9,
        });
        tx.deal({
          fromZoneId: "deck",
          playerId: second,
          toZoneId: "hand",
          count: 3,
        });
        tx.setActivePlayers([first]);
      },
      interactions: {
        play: play.interaction({
          presentation: { label: "Play" },
          inputs: { card: handCard(["hearts", "spades"]) },
          reduce({ tx, input }) {
            tx.moveCardFromPlayerZoneToSharedZone({
              playerId: input.playerId,
              fromZoneId: "hand",
              toZoneId: "table",
              cardId: input.params.card,
            });
          },
        }),
        discard: play.interaction({
          presentation: { label: "Discard" },
          inputs: { card: handCard(["spades", "clubs"]) },
          reduce({ tx, input }) {
            tx.moveCardFromPlayerZoneToSharedZone({
              playerId: input.playerId,
              fromZoneId: "hand",
              toZoneId: "discard",
              cardId: input.params.card,
            });
          },
        }),
        draw: play.interaction({
          presentation: { label: "Draw" },
          inputs: {},
          rules: [
            {
              id: "deck-has-cards",
              errorCode: "DECK_EMPTY",
              message: "The draw pile is empty.",
              available: ({ q }) => q.zone.sharedCards("deck").length > 0,
            },
          ],
          reduce({ tx, input }) {
            tx.deal({
              fromZoneId: "deck",
              playerId: input.playerId,
              toZoneId: "hand",
              count: 1,
            });
          },
        }),
        endTurn: play.interaction({
          presentation: { label: "End turn" },
          inputs: {},
          reduce({ tx, input, q }) {
            const order = q.player.order();
            tx.setActivePlayers([
              order[(order.indexOf(input.playerId) + 1) % order.length],
            ]);
          },
        }),
      },
    }),
  },
  // Seats show how many cards each player holds.
  view: model.view(({ q }) => ({
    handCounts: Object.fromEntries(
      q.player
        .order()
        .map((playerId) => [
          playerId,
          q.zone.playerCards(playerId, "hand").length,
        ]),
    ),
  })),
});
