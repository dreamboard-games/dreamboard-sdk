import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  scenarioSource,
  type LocalSource,
  type LocalCheckpoint,
} from "@dreamboard-games/sdk/testing";
import { GameProvider, useGame } from "../typecheck/game";
import { BoardTargets } from "../items/board-targets";
import privateTilesScenario from "../test/scenarios/private-tiles.scenario";
import { privateTilesGame } from "./private-tiles-game";
function Surface({ source }: { source: LocalSource<typeof privateTilesGame> }) {
  const game = useGame((value) => value);
  const [saved, setSaved] = useState<LocalCheckpoint | null>(null);
  const [held, setHeld] = useState<(() => void) | null>(null);
  const [probe, setProbe] = useState(0);
  const [heldRef, setHeldRef] = useState<string | null>(null);
  const [referenceResult, setReferenceResult] = useState("");
  const zone = game.zones.find("bag", "table");
  const tiles = zone?.getTiles() ?? [];
  const snapshot = game.snapshot;
  const board = game.boards.find("map");
  const boardTiles = board?.getLayout({ hexSize: 60 }).getTiles() ?? [];
  function submit(key: string) {
    void game.interactions.get(key).submit();
  }
  return (
    <main
      data-private-tiles
      data-version={game.version}
      style={{ maxWidth: 700, padding: 16 }}
    >
      <h1>Private tile expedition</h1>
      <label>
        Selected seat{" "}
        <select
          aria-label="Selected seat"
          value={snapshot?.me ?? ""}
          onChange={(event) => source.switchSeat(event.target.value)}
        >
          {snapshot?.players.map((player) => (
            <option key={player.playerId} value={player.playerId}>
              {player.playerId}
            </option>
          ))}
        </select>
      </label>
      <section aria-label="Tile bag">
        {tiles.map((tile, index) => (
          <button
            key={tile.ref}
            {...tile.getTargetProps({
              interaction: "play.place",
              input: "tile",
            })}
            data-bag-tile
            onClick={() => {
              tile.select({ interaction: "play.place", input: "tile" });
              submit("play.place");
            }}
          >{`Tile back ${index + 1}`}</button>
        ))}
      </section>
      <button
        onClick={() => {
          const tile = tiles[0];
          if (tile) {
            setHeld(() =>
              tile.getSelectHandler({
                interaction: "play.place",
                input: "tile",
              }),
            );
            setHeldRef(tile.ref);
          }
        }}
      >
        Hold tile handler
      </button>
      <button
        disabled={!held}
        onClick={() => {
          held?.();
          setProbe((value) => value + 1);
        }}
        data-probe-count={probe}
      >
        Try held handler
      </button>
      <button
        disabled={!heldRef}
        onClick={() => {
          if (heldRef)
            void source
              .submit("place", { tile: heldRef })
              .then((result) =>
                setReferenceResult(result.accepted ? "accepted" : "rejected"),
              );
        }}
      >
        Try held reference
      </button>
      <output aria-label="Held reference result">{referenceResult}</output>
      <button onClick={() => setSaved(source.checkpoint())}>
        Save checkpoint
      </button>
      <button
        disabled={!saved}
        onClick={() => {
          if (saved) source.restore(saved);
        }}
      >
        Restore checkpoint
      </button>
      <button onClick={() => submit("play.shuffle")}>Shuffle bag</button>
      <button onClick={() => submit("play.reveal")}>Reveal board</button>
      <button
        disabled={!tiles[0]}
        onClick={() => {
          tiles[0]?.select({ interaction: "play.trackBag", input: "tile" });
          submit("play.trackBag");
        }}
      >
        Track bag tile
      </button>
      <button
        disabled={!boardTiles[0]}
        onClick={() => {
          game.inputs
            .get("play.trackBoard", "tile")
            .setValue(boardTiles[0].ref);
          submit("play.trackBoard");
        }}
      >
        Track board tile
      </button>
      {game.interactions
        .list()
        .filter((interaction) =>
          ["play.place", "play.trackBag", "play.trackBoard"].includes(
            interaction.key,
          ),
        )
        .map((interaction) => (
          <section key={interaction.key} aria-label={interaction.key}>
            <output
              data-draft={interaction.key}
              style={{ overflowWrap: "anywhere" }}
            >
              {JSON.stringify(interaction.getStep()?.selected ?? {})}
            </output>
            {interaction.getStepIndex() === 1 && (
              <button
                onClick={() => {
                  game.inputs
                    .get(interaction.key, "confirm")
                    .setValue(
                      interaction.key === "play.place" ? "place" : "finish",
                    );
                  void interaction.submit();
                }}
              >
                Confirm{" "}
                {interaction.key === "play.place" ? "placement" : "tracking"}
              </button>
            )}
          </section>
        ))}
      <BoardTargets
        boardId="map"
        hexSize={60}
        label="Expedition board"
        tileProps={(tile) => ({
          fill: tile.data.disclosure === "concealed" ? "#94a3b8" : "#86efac",
          stroke: "#334155",
          "data-tile-disclosure": tile.data.disclosure,
        })}
        renderTile={(tile) =>
          tile.data.disclosure === "visible" ? (
            <text x={tile.center.x} y={tile.center.y}>
              {tile.data.name}
            </text>
          ) : null
        }
      />
      <pre
        aria-label="Authorized frame"
        tabIndex={0}
        style={{
          maxHeight: 180,
          overflow: "auto",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
        }}
      >
        {JSON.stringify(snapshot?.frame)}
      </pre>
    </main>
  );
}
function Owned({
  created,
}: {
  created: { source: LocalSource<typeof privateTilesGame>; adopted: boolean };
}) {
  useLayoutEffect(() => {
    created.adopted = true;
  }, [created]);
  return (
    <GameProvider source={created.source}>
      <Surface source={created.source} />
    </GameProvider>
  );
}
function PrivateTiles() {
  const [created, setCreated] = useState<{
    source: LocalSource<typeof privateTilesGame>;
    adopted: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let value: typeof created = null;
    void scenarioSource(privateTilesGame, privateTilesScenario, {
      at: "opening",
    })
      .then((source) => {
        if (active) {
          value = { source, adopted: false };
          setCreated(value);
        } else source.dispose();
      })
      .catch((reason) => setError(String(reason)));
    return () => {
      active = false;
      if (value && !value.adopted) value.source.dispose();
    };
  }, []);
  if (error) return <p role="alert">{error}</p>;
  return created ? <Owned created={created} /> : <p>Loading expedition…</p>;
}
const meta = { title: "Private tiles", component: PrivateTiles } satisfies Meta<
  typeof PrivateTiles
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Expedition: Story = {};
