import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useLayoutEffect, useState } from "react";
import { localSource, type LocalSource } from "@dreamboard-games/sdk/testing";
import { GameProvider, useGame } from "../typecheck/game";
import { BoardTargets } from "../items/board-targets";
import { triHexGame } from "./tri-hex-game";

function Surface() {
  const game = useGame((value) => value);
  const view = game.view;
  const count =
    view &&
    typeof view === "object" &&
    !Array.isArray(view) &&
    "selectedCount" in view &&
    typeof view.selectedCount === "number"
      ? view.selectedCount
      : 0;
  return (
    <main data-trihex style={{ maxWidth: 800, width: "100%", padding: 16 }}>
      <h1>Tri-hex island</h1>
      <p>Twelve rotating tiles surround the centre. Select any terrain cell.</p>
      <p>
        Selected cells:{" "}
        <output data-trihex-selection-count>{String(count ?? 0)}</output>
      </p>
      <BoardTargets
        boardId="map"
        hexSize={44}
        label="Tri-hex island board"
        tileProps={() => ({
          fill: "none",
          stroke: "#0f172a",
          strokeWidth: 4,
          "data-tile-outline": "true",
        })}
        renderTile={(tile) => (
          <g
            data-tile-art
            data-rotation-degrees={tile.rotationDegrees}
            transform={`rotate(${tile.rotationDegrees} ${tile.anchor.x} ${tile.anchor.y})`}
          >
            <path
              d={`M${tile.anchor.x - 8},${tile.anchor.y} L${tile.anchor.x + 8},${tile.anchor.y} L${tile.anchor.x + 3},${tile.anchor.y - 5}`}
              fill="none"
              stroke="#0f172a"
              strokeWidth={2}
            />
          </g>
        )}
        spaceProps={(space) => ({
          "data-trihex-space": "true",
          fill:
            space.data.fields.terrain === "forest"
              ? "#86efac"
              : space.data.fields.terrain === "hills"
                ? "#fcd34d"
                : space.data.fields.terrain === "lake"
                  ? "#93c5fd"
                  : "#e2e8f0",
          fillOpacity: 0.7,
          stroke: "#334155",
        })}
      />
    </main>
  );
}
function Owned({
  created,
}: {
  created: { source: LocalSource<typeof triHexGame>; adopted: boolean };
}) {
  useLayoutEffect(() => {
    created.adopted = true;
  }, [created]);
  return (
    <GameProvider source={created.source}>
      <Surface />
    </GameProvider>
  );
}
function TriHex() {
  const [created, setCreated] = useState<{
    source: LocalSource<typeof triHexGame>;
    adopted: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let value: typeof created = null;
    void localSource(triHexGame, { players: 1, seed: 17 })
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
  return created ? <Owned created={created} /> : <p>Building island…</p>;
}
const meta = { title: "Boards/Tri-hex", component: TriHex } satisfies Meta<
  typeof TriHex
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Island: Story = {};
