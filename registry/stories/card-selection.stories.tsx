import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { cardSelectionFeature, dragFeature } from "@dreamboard-games/sdk";
import {
  createGameHook,
  useMarqueeSelection,
} from "@dreamboard-games/sdk/react";
import {
  compileManifest,
  createGame,
  many,
} from "@dreamboard-games/sdk/reducer";
import { localSource } from "@dreamboard-games/sdk/testing";
const model = createGame({
  manifest: compileManifest({
    players: { minPlayers: 1, maxPlayers: 1 },
    cardSets: [
      {
        id: "cards",
        name: "Cards",
        cardSchema: z.object({}),
        cards: ["red", "blue", "green"].map((id) => ({
          id,
          cardType: "card",
          name: id,
          count: 1,
          properties: {},
        })),
        defaultHome: { type: "zone", zoneId: "table" },
      },
    ],
    zones: [
      { id: "table", name: "Table", scope: "shared", visibility: "public" },
      { id: "discard", name: "Discard", scope: "shared", visibility: "public" },
    ],
  }),
  phases: { play: z.object({}) },
  state: {
    public: z.object({ moves: z.number() }),
    private: z.object({}),
    hidden: z.object({}),
  },
});
const play = model.phase("play");
const game = model.assemble({
  initial: {
    public: () => ({ moves: 0 }),
    private: () => ({}),
    hidden: () => ({}),
  },
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      enter({ tx, q }) {
        tx.setActivePlayers(q.player.order());
      },
      interactions: {
        move: play.interaction({
          inputs: {
            cards: many(play.inputs.card({ from: ["table"] }), {
              min: 1,
              distinct: true,
            }),
          },
          reduce({ tx, state, input }) {
            for (const id of input.params.cards)
              tx.moveComponentToZone({
                componentId: id,
                to: { zoneId: "discard" },
              });
            tx.patchPublicState({ moves: state.publicState.moves + 1 });
          },
        }),
      },
    }),
  },
  view: model.view(({ state }) => ({ moves: state.publicState.moves })),
});
const { GameProvider, useGame, useCardGesture, useDropArea, useDragOverlay } =
  createGameHook<typeof game>()({
    features(core, context) {
      const selection = cardSelectionFeature(core, context);
      return {
        selection,
        drag: dragFeature(core, context, {
          getSelection: (id) => {
            const ids = selection.root.cardSelection.cardIds;
            return ids.includes(id) ? ids : [id];
          },
        }),
      };
    },
  });
function Card({ id }: { id: string }) {
  const game = useGame();
  const gesture = useCardGesture(id, { drag: { interaction: "play.move" } });
  return (
    <button
      {...gesture.props}
      data-test-card={id}
      aria-pressed={game.cardSelection.cardIds.includes(id)}
      onClick={() => game.cardSelection.toggle(id)}
      style={{
        ...gesture.props.style,
        width: 64,
        height: 90,
        border: "2px solid",
        background: game.cardSelection.cardIds.includes(id) ? "#cde" : "white",
      }}
    >
      {id}
    </button>
  );
}
function Table() {
  const game = useGame();
  const surface = useRef<HTMLDivElement>(null);
  const marquee = useMarqueeSelection({
    enabled: true,
    getCards: () =>
      Array.from(
        surface.current!.querySelectorAll<HTMLElement>("[data-test-card]"),
      ).map((element) => ({ id: element.dataset.testCard!, element })),
    onSelect: (ids, additive) =>
      game.cardSelection.set(
        additive ? [...game.cardSelection.cardIds, ...ids] : ids,
      ),
  });
  const area = useDropArea({ interaction: "play.move" });
  const overlay = useDragOverlay();
  return (
    <div style={{ padding: 12 }}>
      <div
        ref={surface}
        {...marquee.props}
        data-testid="selection-area"
        style={{
          display: "flex",
          gap: 12,
          padding: 24,
          border: "1px solid",
          width: 288,
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        {game.zones
          .get("table", "table")
          .getCards()
          .map((card) => (
            <Card key={card.id} id={card.id} />
          ))}
      </div>
      <div
        {...area.props}
        data-testid="group-drop"
        style={{ height: 100, marginTop: 30, background: "#ddd" }}
      >
        Discard: {game.zones.get("discard", "table").count}
      </div>
      <output data-testid="group-moves">{game.view?.moves}</output>
      <output data-testid="group-selection">
        {game.cardSelection.cardIds.length}
      </output>
      {marquee.bounds && (
        <div
          data-testid="marquee"
          style={{
            ...marquee.bounds,
            position: "fixed",
            pointerEvents: "none",
            border: "1px solid blue",
          }}
        />
      )}
      {overlay && (
        <div
          ref={overlay.ref}
          data-testid="group-overlay"
          style={{
            position: "fixed",
            pointerEvents: "none",
            background: "#cde",
            padding: 10,
          }}
        >
          {overlay.cardIds.length} cards
        </div>
      )}
    </div>
  );
}
const createSource = () => localSource(game, { players: 1, seed: 3 });
function Example() {
  const [source, setSource] = useState<Awaited<
    ReturnType<typeof createSource>
  > | null>(null);
  useEffect(() => {
    let cancelled = false;
    void createSource().then((value) => {
      if (cancelled) value.dispose();
      else setSource(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return source ? (
    <GameProvider source={source}>
      <Table />
    </GameProvider>
  ) : (
    <div>Loading…</div>
  );
}
export default { title: "Card selection", component: Example };
export const MarqueeAndGroupDrop = {};
