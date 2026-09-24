import { expect, test } from "vitest";
import { build } from "esbuild";
import { createDevelopmentSource } from "../../ui/development-source";

test("hosted Hearts has no executable game, reducer or testing source in its browser closure", async () => {
  const result = await build({
    entryPoints: [new URL("../../ui/index.tsx", import.meta.url).pathname],
    bundle: true,
    platform: "browser",
    format: "esm",
    write: false,
    metafile: true,
    loader: { ".css": "empty" },
  });
  const inputs = Object.keys(result.metafile!.inputs);
  expect(inputs.some((path) => /hearts\/(app|test)\//.test(path))).toBe(false);
  expect(
    inputs.some((path) =>
      /sdk\/src\/(reducer|testing|runtime|ui)\//.test(path),
    ),
  ).toBe(false);
  expect(inputs.some((path) => path.startsWith("node:"))).toBe(false);
});

test("local query opens the actual selected seat and named terminal checkpoint", async () => {
  const source = await createDevelopmentSource(
    new URLSearchParams("scenario=complete&at=game-over&as=player-3"),
  );
  try {
    expect(source.inspect().me).toBe("player-3");
    expect(source.inspect().players.map((player) => player.playerId)).toEqual([
      "player-1",
      "player-2",
      "player-3",
      "player-4",
    ]);
    expect(source.inspect().frame.flow.currentPhase).toBe("gameOver");
    expect(source.checkpoint().terminal?.standings[0]?.playerId).toBe(
      "player-4",
    );
  } finally {
    source.dispose();
  }
});

test("local seat switching keeps private hands separate without reinitialization", async () => {
  const source = await createDevelopmentSource(new URLSearchParams());
  try {
    const checkpoint = source.checkpoint();
    const first = source.inspect().frame.zones.hand!.cardIds;
    source.switchSeat("player-2");
    const second = source.inspect().frame.zones.hand!.cardIds;
    expect(first).toHaveLength(13);
    expect(second).toHaveLength(13);
    expect(first.some((id) => second.includes(id))).toBe(false);
    expect(source.checkpoint()).toEqual(checkpoint);
  } finally {
    source.dispose();
  }
});

test("unknown scenarios and seats fail explicitly", async () => {
  await expect(
    createDevelopmentSource(new URLSearchParams("scenario=missing")),
  ).rejects.toThrow("Unknown Hearts scenario");
  await expect(
    createDevelopmentSource(new URLSearchParams("as=unknown")),
  ).rejects.toThrow();
});
