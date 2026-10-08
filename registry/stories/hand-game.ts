import { compileManifest } from "@dreamboard-games/sdk/reducer";
import { createGame } from "@dreamboard-games/sdk/reducer";
import { z } from "zod";
const suits = ["hearts", "spades", "clubs", "diamonds"] as const;
const ranks = ["2", "3", "4", "5"] as const;
/** Each suit and rank `copies` times. */
const createHandModel = (copies: number) =>
  createGame({
    manifest: compileManifest({
      players: { minPlayers: 2, maxPlayers: 2 },
      cardSets: [
        {
          id: "cards",
          name: "Cards",
          cardSchema: z.object({
            suit: z.enum([...suits]),
            rank: z.enum([...ranks]),
          }),
          cards: suits.flatMap((suit) =>
            ranks.map((rank) => ({
              id: `${suit}-${rank}`,
              cardType: "card",
              name: `${rank} of ${suit}`,
              count: copies,
              properties: { suit, rank },
            })),
          ),
          defaultHome: { type: "zone", zoneId: "deck" },
        },
      ],
      zones: [
        { id: "deck", name: "Deck", scope: "shared", visibility: "hidden" },
        {
          id: "hand",
          name: "Hand",
          scope: "perPlayer",
          visibility: "ownerOnly",
        },
        { id: "table", name: "Table", scope: "shared", visibility: "public" },
        {
          id: "discard",
          name: "Discard",
          scope: "shared",
          visibility: "public",
        },
      ],
    }),
    phases: { play: z.object({}) },
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
/**
 * A dealt hand where hearts only play, spades play or discard, clubs only
 * discard and diamonds do nothing: one card per action-menu case. Ending the
 * turn passes it to the other player. With `reorder`, any hand card also
 * moves to a place in the hand.
 */
export function createHandGame(handSize: number, copies = 1, reorder = false) {
  const model = createHandModel(copies);
  const play = model.phase("play");
  const moves = {
    reorder: play.interaction({
      presentation: { label: "Move in hand" },
      inputs: {
        card: play.inputs.card({ from: ["hand"] }),
        to: play.inputs.position({ zones: ["hand"] }),
      },
      reduce({ tx, input }) {
        tx.moveComponentToPosition({
          componentId: input.params.card,
          at: input.params.to,
        });
      },
    }),
  };
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
  return model.assemble({
    initial: { public: () => ({}) },
    initialPhase: "play",
    phases: {
      play: play.define({
        kind: "player",
        initialState: () => ({}),
        enter({ tx, q }) {
          const [first, second] = q.player.order();
          tx.shuffle({ zone: { zoneId: "deck" } });
          tx.deal({
            from: { zoneId: "deck" },
            to: { zoneId: "hand", hostId: first },
            count: handSize,
          });
          tx.deal({
            from: { zoneId: "deck" },
            to: { zoneId: "hand", hostId: second },
            count: 3,
          });
          tx.setActivePlayers([first]);
        },
        interactions: {
          play: play.interaction({
            presentation: { label: "Play" },
            inputs: { card: handCard(["hearts", "spades"]) },
            reduce({ tx, input }) {
              tx.moveComponentToZone({
                componentId: input.params.card,
                to: { zoneId: "table" },
              });
            },
          }),
          discard: play.interaction({
            presentation: { label: "Discard" },
            inputs: { card: handCard(["spades", "clubs"]) },
            reduce({ tx, input }) {
              tx.moveComponentToZone({
                componentId: input.params.card,
                to: { zoneId: "discard" },
              });
            },
          }),
          flip: play.interaction({
            presentation: { label: "Flip" },
            inputs: { card: play.inputs.card({ from: ["table"] }) },
            reduce({ tx, input, q }) {
              tx.flipCard({
                cardId: input.params.card,
                faceUp: !q.card.visibility(input.params.card)?.faceUp,
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
                available: ({ q }) => q.zone("deck").length > 0,
              },
            ],
            reduce({ tx, input }) {
              tx.deal({
                from: { zoneId: "deck" },
                to: { zoneId: "hand", hostId: input.playerId },
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
          ...(reorder ? moves : {}),
        },
      }),
    },
    // Seats show how many cards each player holds.
    view: model.view(({ q }) => ({
      handCounts: Object.fromEntries(
        q.player
          .order()
          .map((playerId) => [playerId, q.zone("hand", playerId).length]),
      ),
    })),
  });
}
export const handGame = createHandGame(9);
/** More cards than a phone's hand can show: the hand opens as a sheet. */
export const crowdedHandGame = createHandGame(24, 2);
/** A hand whose cards also move to a place in it. */
export const reorderHandGame = createHandGame(9, 1, true);
