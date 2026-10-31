import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { z } from "zod";
import { compileManifest, createGame } from "@dreamboard-games/sdk/reducer";
import { localSource } from "@dreamboard-games/sdk/testing";
import type { CommandSource } from "@dreamboard-games/sdk";
import { GameProvider, useGame, useGameShortcuts } from "../typecheck/game";
import { CardControl } from "../items/card-control";
import { Card, CardBack } from "../items/card";
import { DrawPile } from "../items/draw-pile";

const model = createGame({
  manifest: compileManifest({
    players: { minPlayers: 1, maxPlayers: 1 },
    zones: ["first", "second", "hidden", "deck", "hand"].map((id) => ({
      id,
      name: id,
      scope: "shared" as const,
      visibility: "public" as const,
    })),
    cardSets: [
      {
        id: "cards",
        name: "Cards",
        cardSchema: z.object({}),
        defaultHome: { type: "zone", zoneId: "first" },
        cards: ["source", "destination", "private", "reverse"].map((id) => ({
          id,
          name: id,
          count: 1,
          cardType: "card",
          properties: {},
        })),
      },
    ],
  }),
  phases: { play: z.object({}) },
  state: {
    public: z.object({ pairs: z.number(), draws: z.number() }),
    private: z.object({}),
    hidden: z.object({}),
  },
});
const play = model.phase("play");
const game = model.assemble({
  initial: { public: () => ({ pairs: 0, draws: 0 }) },
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      enter({ tx, q }) {
        tx.setActivePlayers(q.player.order());
        tx.moveComponentToZone({
          componentId: "destination",
          to: { zoneId: "second" },
        });
        for (const id of ["private", "reverse"]) {
          tx.moveComponentToZone({ componentId: id, to: { zoneId: "hidden" } });
          tx.flipCard({ cardId: id, faceUp: false });
        }
      },
      interactions: {
        pair: play.interaction({
          presentation: { label: "Pair cards" },
          inputs: {
            origin: play.inputs.card({ from: ["first"] }),
            recipient: play.inputs.card({ from: ["second"] }),
          },
          reduce({ tx, state }) {
            tx.patchPublicState({ pairs: state.publicState.pairs + 1 });
          },
        }),
        draw: play.interaction({
          presentation: { label: "Resolve empty draw" },
          inputs: {},
          reduce({ tx, state }) {
            tx.patchPublicState({ draws: state.publicState.draws + 1 });
          },
        }),
      },
    }),
  },
  view: model.view(({ state }) => state.publicState),
});

interface StorySource extends CommandSource {
  failNextDraw(mode: "reject" | "throw"): void;
}

function Controls({ source }: { source: StorySource }) {
  const current = useGame();
  useGameShortcuts({
    bindings: [
      {
        kind: "interaction",
        keys: ["p"],
        label: "Pair source",
        target: "card",
        interaction: "play.pair",
        input: "origin",
        inputs: ({ target }) => ({
          origin: target.value,
          recipient: "destination",
        }),
      },
      {
        kind: "interaction",
        keys: ["x"],
        label: "Pair destination",
        target: "card",
        interaction: "play.pair",
        input: "recipient",
        inputs: ({ target }) => ({ origin: "source", recipient: target.value }),
      },
    ],
  });
  const [selected, setSelected] = useState(false);
  const [choices, setChoices] = useState(0);
  return (
    <div
      style={
        {
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          padding: 32,
          "--card-w": "90px",
        } as React.CSSProperties
      }
    >
      <output data-testid="action-results">
        {JSON.stringify(current.view)}
      </output>
      <output data-testid="custom-choices">{choices}</output>
      {(["first", "second", "hidden"] as const).map((zone) =>
        current.zones
          .find(zone, "table")
          ?.getCards()
          .map((card, index) => (
            <div key={card.id} data-testid={`control-${zone}-${index}`}>
              <CardControl
                cardId={card.id}
                drag={false}
                renderCard={(shown) =>
                  shown.hidden ? <CardBack /> : <Card>{shown.id}</Card>
                }
                renderPreview={() => (
                  <Card>Secret front must stay concealed</Card>
                )}
              />
            </div>
          )),
      )}
      {current.zones
        .find("first", "table")
        ?.getCards()
        .map((card) => (
          <div key={card.id} data-testid="custom-control">
            <CardControl
              cardId={card.id}
              drag={false}
              renderCard={() => <Card>Custom selection</Card>}
              onChooseAction={() => setChoices((value) => value + 1)}
              selection={{
                selected,
                active: selected,
                toggle: () => setSelected((value) => !value),
              }}
            >
              {({ control }) => control}
            </CardControl>
          </div>
        ))}
      <button type="button" onClick={() => source.failNextDraw("reject")}>
        Reject next draw
      </button>
      <button type="button" onClick={() => source.failNextDraw("throw")}>
        Throw next draw
      </button>
      <DrawPile
        zoneId="deck"
        hostId="table"
        destinationZoneId="hand"
        destinationHostId="table"
        interaction="play.draw"
      />
    </div>
  );
}
function Example() {
  const [source, setSource] = useState<StorySource | null>(null);
  useEffect(() => {
    let active = true;
    let owned: CommandSource | null = null;
    void localSource(game, { players: 1, seed: 1 }).then((value) => {
      if (!active) return value.dispose();
      owned = value;
      let failure: "reject" | "throw" | null = null;
      setSource({
        store: value.store,
        dispose: () => value.dispose(),
        cancel: (id) => value.cancel(id),
        failNextDraw(mode) {
          failure = mode;
        },
        async submit(id, params) {
          if (id === "draw" && failure) {
            const mode = failure;
            failure = null;
            if (mode === "throw")
              throw new Error("Empty draw transport failed.");
            return {
              accepted: false,
              errorCode: "DRAW_REJECTED",
              message: "Empty draw was rejected.",
            };
          }
          return value.submit(id, params);
        },
      });
    });
    return () => {
      active = false;
      owned?.dispose();
    };
  }, []);
  return (
    source && (
      <GameProvider source={source}>
        <Controls source={source} />
      </GameProvider>
    )
  );
}
const meta = {
  title: "Registry/Card actions",
  component: Example,
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const EligibilityAndComposition: Story = {};
