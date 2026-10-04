import { describe, expect, it } from "vitest";
import { z } from "zod";
import { RuntimeJsonSchema } from "../../shared/runtime-json.js";
import { createGame, many } from "../../reducer.js";
import { localSource } from "../../testing/sources/local-source.js";
import { createGameInstance } from "../instance.js";
import { boardFeature } from "./board.js";
import { dragFeature } from "./drag.js";

const targetSchema = z.object({
  boardId: z.string(),
  playerId: z.string(),
  spaceId: z.string(),
});
function authoredGame() {
  const model = createGame({
    manifest: {
      players: { minPlayers: 2, maxPlayers: 2 },
      cardSets: [
        {
          id: "cards",
          name: "Cards",
          cardSchema: z.object({}),
          cards: [
            {
              id: "card",
              name: "Card",
              cardType: "card",
              count: 1,
              properties: {},
            },
          ],
          defaultHome: { type: "zone", zoneId: "table" },
        },
      ],
      zones: [
        {
          id: "table",
          name: "Table",
          scope: "shared",
          visibility: "public",
          allowedCardSetIds: ["cards"],
        },
      ],
      boards: [
        {
          id: "mat",
          name: "Mat",
          scope: "perPlayer",
          layout: "square",
          spaces: [{ id: "slot", row: 0, col: 0 }],
          edges: [],
          vertices: [],
          relations: [],
          containers: [],
        },
      ],
    },
    state: {
      public: z.object({ selected: z.array(targetSchema), open: z.boolean() }),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: { play: z.object({}) },
  });
  const play = model.phase("play");
  const any = play.inputs.board.playerSpace({
    boardId: "mat",
    where: {
      id: "open",
      errorCode: "CLOSED",
      test: ({ state }) => state.publicState.open,
    },
  });
  const own = play.inputs.board.playerSpace({
    boardId: "mat",
    where: {
      id: "owner",
      errorCode: "NOT_OWNED",
      test: ({ playerId, target }) => playerId === target.playerId,
    },
  });
  return model.assemble({
    initial: { public: () => ({ selected: [], open: true }) },
    initialPhase: "play",
    phases: {
      play: play.define({
        kind: "player",
        initialState: () => ({}),
        enter({ tx, state }) {
          tx.setActivePlayers([state.table.playerOrder[0]]);
        },
        interactions: {
          single: play.interaction({
            commit: { mode: "manual" },
            inputs: { space: any },
            reduce({ tx, input }) {
              tx.patchPublicState({ selected: [input.params.space] });
            },
          }),
          own: play.interaction({
            commit: { mode: "manual" },
            inputs: { space: own },
            reduce({ tx, input }) {
              tx.patchPublicState({ selected: [input.params.space] });
            },
          }),
          several: play.interaction({
            commit: { mode: "manual" },
            inputs: { spaces: many(any, { min: 2, max: 2, distinct: true }) },
            reduce({ tx, input }) {
              tx.patchPublicState({ selected: input.params.spaces });
            },
          }),
          drop: play.interaction({
            commit: { mode: "manual" },
            inputs: { card: play.inputs.card({ from: ["table"] }), space: any },
            reduce({ tx, input }) {
              tx.patchPublicState({ selected: [input.params.space] });
            },
          }),
          scalar: play.interaction({
            commit: { mode: "manual" },
            inputs: {
              space: play.inputs.board.space({ boardId: "mat:player-2" }),
            },
            reduce() {},
          }),
          close: play.interaction({
            commit: { mode: "manual" },
            inputs: {},
            reduce({ tx }) {
              tx.patchPublicState({ open: false });
            },
          }),
        },
      }),
    },
    view: model.view(({ state }) => ({ selected: state.publicState.selected })),
  });
}
const ownTarget = { boardId: "mat", playerId: "player-1", spaceId: "slot" };
const opponentTarget = {
  boardId: "mat",
  playerId: "player-2",
  spaceId: "slot",
};
async function setup() {
  const source = await localSource(authoredGame(), { players: 2, seed: 1 });
  const game = createGameInstance()({
    source,
    features: (core, context) => ({
      board: boardFeature(core, context),
      drag: dragFeature(core, context),
    }),
  });
  return {
    source,
    game,
    space: (id: string) =>
      game.boards.get(id).getLayout({ hexSize: 20 }).getSpaces()[0],
  };
}

describe("per-player board target identity through local sources", () => {
  it("projects complete tuples and allows the opponent selected by the authored domain", async () => {
    const { source, game, space } = await setup();
    const input = game.interactions.get("play.single").getInputs()[0];
    expect(input.getEligibleTargets()).toEqual([ownTarget, opponentTarget]);
    expect(input.getIsEligible("slot")).toBe(false);
    expect(input.getIsEligible({ ...opponentTarget, boardId: "other" })).toBe(
      false,
    );
    expect(
      input.getIsEligible({ ...opponentTarget, playerId: "missing" }),
    ).toBe(false);
    const old = space("mat:player-2");
    old.getTargetProps({ interaction: "play.single" }).onClick();
    expect(game.state.drafts["play.single"]?.space).toEqual(opponentTarget);
    expect(old.getIsSelected()).toBe(false);
    expect(space("mat:player-1").getIsSelected()).toBe(false);
    expect(space("mat:player-2").getIsSelected()).toBe(true);
    expect(
      game.interactions.get("play.single").getInputs()[0].getIsSelected({
        spaceId: "slot",
        playerId: "player-2",
        boardId: "mat",
      }),
    ).toBe(true);
    expect(await game.interactions.get("play.single").submit()).toEqual({
      accepted: true,
    });
    expect(source.inspect().frame.view).toMatchObject({
      selected: [opponentTarget],
    });
    game.dispose();
  });

  it("submits two same-named spaces independently and uses semantic tuple equality for toggles", async () => {
    const { source, game, space } = await setup();
    space("mat:player-1").getSelectHandler({ interaction: "play.several" })();
    space("mat:player-2").getSelectHandler({ interaction: "play.several" })();
    const input = game.interactions.get("play.several").getInputs()[0];
    expect(input.getValue()).toEqual([ownTarget, opponentTarget]);
    input
      .getTargetProps({ spaceId: "slot", playerId: "player-2", boardId: "mat" })
      .onClick();
    expect(
      game.interactions.get("play.several").getInputs()[0].getValue(),
    ).toEqual([ownTarget]);
    space("mat:player-2").getSelectHandler({ interaction: "play.several" })();
    expect(await game.interactions.get("play.several").submit()).toEqual({
      accepted: true,
    });
    expect(source.inspect().frame.view).toMatchObject({
      selected: [ownTarget, opponentTarget],
    });
    game.dispose();
  });

  it("rejects scalars, forged identity, excluded opponents and reordered duplicate tuples without mutation", async () => {
    const { source, game, space } = await setup();
    expect(
      space("mat:player-2").getTargetProps({ interaction: "play.own" })
        .disabled,
    ).toBe(true);
    for (const [interaction, params] of [
      ["single", { space: "slot" }],
      ["single", { space: { ...ownTarget, boardId: "mat:player-1" } }],
      ["single", { space: { ...ownTarget, playerId: "unknown" } }],
      ["own", { space: opponentTarget }],
      ["several", { spaces: ["slot", "slot"] }],
      [
        "several",
        {
          spaces: [
            ownTarget,
            { spaceId: "slot", playerId: "player-1", boardId: "mat" },
          ],
        },
      ],
    ] as const) {
      const before = source.checkpoint();
      expect(
        (await source.submit(interaction, RuntimeJsonSchema.parse(params)))
          .accepted,
      ).toBe(false);
      expect(source.checkpoint()).toEqual(before);
    }
    expect(await source.submit("own", { space: ownTarget })).toEqual({
      accepted: true,
    });
    game.dispose();
  });

  it("rechecks stale click eligibility while retaining old snapshot values", async () => {
    const { source, game, space } = await setup();
    const old = space("mat:player-2");
    const oldInput = game.interactions.get("play.single").getInputs()[0];
    old.getSelectHandler({ interaction: "play.single" })();
    expect(await source.submit("close", {})).toEqual({ accepted: true });
    expect(
      game.interactions.get("play.single").getInputs()[0].getValue(),
    ).toBeUndefined();
    old.getSelectHandler({ interaction: "play.single" })();
    expect(
      game.interactions.get("play.single").getInputs()[0].getValue(),
    ).toBeUndefined();
    expect(oldInput.getEligibleTargets()).toEqual([ownTarget, opponentTarget]);
    expect(Object.isFrozen(oldInput.getEligibleTargets()[0])).toBe(true);
    game.dispose();
  });

  it("preserves complete scalar IDs for a specifically addressed runtime board", async () => {
    const { source, game, space } = await setup();
    const target = space("mat:player-2");
    expect(target.getTargetProps({ interaction: "play.scalar" }).disabled).toBe(
      false,
    );
    target.getSelectHandler({ interaction: "play.scalar" })();
    expect(game.state.drafts["play.scalar"]?.space).toBe("slot");
    expect(await game.interactions.get("play.scalar").submit()).toEqual({
      accepted: true,
    });
    expect(source.inspect().version).toBe(2);
    game.dispose();
  });

  it("drops a real projected card on the opponent's complete tuple", async () => {
    const { source, game } = await setup();
    game.drag.begin(game.zones.get("table").getCards()[0].id, {
      interaction: "play.drop",
    });
    const targets = game.drag
      .getDropTargets()
      .filter((target) => target.kind !== "interaction");
    expect(targets.map((target) => target.value)).toEqual([
      ownTarget,
      opponentTarget,
    ]);
    const target = targets[1];
    if (target.valueKind !== "player-board-space")
      throw new Error("Expected a player-space drop target");
    game.drag.setDropTarget({
      ...target,
      value: { spaceId: "slot", playerId: "player-2", boardId: "mat" },
    });
    game.drag.drop();
    expect(game.state.drafts["play.drop"]).toEqual({
      card: game.zones.get("table").getCards()[0].id,
      space: opponentTarget,
    });
    expect(await game.interactions.get("play.drop").submit()).toEqual({
      accepted: true,
    });
    expect(source.inspect().frame.view).toMatchObject({
      selected: [opponentTarget],
    });
    game.dispose();
  });
});
