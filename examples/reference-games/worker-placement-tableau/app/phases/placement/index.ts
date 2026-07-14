import { z } from "zod";
import { boardTarget, defineInputs } from "@dreamboard-games/sdk/reducer";
import type { InputCollector } from "@dreamboard-games/sdk/reducer/advanced";
import {
  ids,
  type PieceId,
  type PlayerId,
  type ResourceId,
  type SpaceId,
} from "../../../shared/manifest-contract";
import { placementAuthoring } from "../../authoring";
import {
  itemTypeSchema,
  resourceMapSchema,
  type GameState,
  type GameEvent,
  type ItemType,
} from "../../game-contract";
import {
  ACTION_SPACE_IDS,
  isValidExchange,
  ITEMS,
  legalCraftCells,
  legalCraftItems,
  otherPlayer,
  RESOURCE_IDS,
  totalResources,
  unusedWorkers,
  workerMayOccupy,
  workerOwner,
} from "../../reducer-support";

type ResourceCollector = InputCollector<
  typeof resourceMapSchema,
  GameState,
  "form"
>;

function dependentResourceMap(
  dependsOn: readonly string[],
  resources: (context: {
    state: GameState;
    playerId: PlayerId;
    q: {
      player: {
        resource(playerId: PlayerId, resourceId: ResourceId): number;
      };
    };
    values: Readonly<Record<string, unknown>>;
  }) => Array<{ resourceId: ResourceId; min: number; max: number }>,
): ResourceCollector {
  return {
    kind: "form",
    schema: resourceMapSchema,
    dependsOn,
    domain: (state, playerId, q, _derived, values) => ({
      type: "resourceMap",
      resources: resources({
        state: state as GameState,
        playerId: playerId as PlayerId,
        q: q as never,
        values: values ?? {},
      }),
    }),
  };
}

const placementSpaceTarget = boardTarget
  .space<GameState, SpaceId>("action-board")
  .where({
    id: "worker-occupancy",
    errorCode: "BOARD_TARGET_NOT_ELIGIBLE",
    message: "That worker cannot occupy that action space.",
    test: ({ state, targetId, values }) => {
      const workerId = values?.workerId as PieceId | undefined;
      return workerId ? workerMayOccupy(state, workerId, targetId) : false;
    },
  })
  .where({
    id: "resolvable-action",
    errorCode: "BOARD_TARGET_NOT_ELIGIBLE",
    message: "That action cannot currently resolve.",
    test: ({ state, playerId, q, targetId }) => {
      if (targetId === "exchangeHouse") {
        return RESOURCE_IDS.some(
          (resourceId) => q.player.resource(playerId, resourceId) > 0,
        );
      }
      if (targetId === "mosaicBench") {
        return (
          legalCraftItems(state, playerId, (amounts) =>
            q.player.canAfford(playerId, amounts),
          ).length > 0
        );
      }
      return ACTION_SPACE_IDS.includes(
        targetId as (typeof ACTION_SPACE_IDS)[number],
      );
    },
  })
  .build();

const placeWorker = placementAuthoring.interaction({
  inputs: defineInputs((input) => {
    const workerId = input.add(
      "workerId",
      placementAuthoring.inputs.form.choice<PieceId>({
        choices: ({ state, playerId }) =>
          unusedWorkers(state, playerId).map((id) => ({
            value: id,
            label: id,
          })),
        defaultValue: ({ choices }) => choices[0]!.value,
      }),
    );
    const spaceId = input.add(
      "spaceId",
      placementAuthoring.inputs.board.space<SpaceId>({
        target: placementSpaceTarget,
        dependsOn: [workerId],
      }),
    );
    const itemType = input.add(
      "itemType",
      placementAuthoring.inputs.form.choice({
        dependsOn: [spaceId],
        choices: ({ state, playerId, q, values }) => {
          const choices: Array<{ value: ItemType | null; label: string }> =
            values.spaceId === "mosaicBench"
              ? legalCraftItems(state, playerId, (amounts) =>
                  q.player.canAfford(playerId, amounts),
                ).map((value) => ({ value, label: ITEMS[value].label }))
              : [{ value: null, label: "Not used" }];
          return choices;
        },
        defaultValue: ({ choices }) => choices[0]!.value,
      }),
    );
    const cellId = input.add(
      "cellId",
      placementAuthoring.inputs.form.choice({
        dependsOn: [spaceId, itemType],
        choices: ({ state, playerId, values }) => {
          const choices: Array<{ value: SpaceId | null; label: string }> =
            values.spaceId === "mosaicBench" && values.itemType
              ? legalCraftCells(
                  state,
                  playerId,
                  values.itemType as ItemType,
                ).map((value) => ({ value, label: value }))
              : [{ value: null, label: "Not used" }];
          return choices;
        },
        defaultValue: ({ choices }) => choices[0]!.value,
      }),
    );
    const give = input.add(
      "give",
      dependentResourceMap([spaceId.key], ({ playerId, q, values }) =>
        RESOURCE_IDS.map((resourceId) => ({
          resourceId,
          min: 0,
          max:
            values.spaceId === "exchangeHouse"
              ? Math.min(2, q.player.resource(playerId, resourceId))
              : 0,
        })),
      ),
    );
    const receive = input.add(
      "receive",
      dependentResourceMap([spaceId.key], ({ values }) =>
        RESOURCE_IDS.map((resourceId) => ({
          resourceId,
          min: 0,
          max: values.spaceId === "exchangeHouse" ? 2 : 0,
        })),
      ),
    );
    return {
      workerId,
      spaceId,
      itemType,
      cellId,
      give,
      receive,
    };
  }),
  paramsSchema: z.object({
    workerId: ids.pieceId,
    spaceId: ids.spaceId,
    give: resourceMapSchema,
    receive: resourceMapSchema,
    itemType: itemTypeSchema.nullable(),
    cellId: ids.spaceId.nullable(),
  }),
  rules: [
    {
      id: "owned-unused-worker",
      errorCode: "INVALID_PLACEMENT",
      validate: ({ state, input }) =>
        workerOwner(input.params.workerId) === input.playerId &&
        state.publicState.workerLocations[input.params.workerId] === null,
    },
    {
      id: "space-specific-payload",
      errorCode: "INVALID_EXCHANGE",
      validate: ({ input, q }) => {
        const { spaceId, give, receive, itemType, cellId } = input.params;
        if (spaceId === "exchangeHouse") {
          return (
            itemType === null &&
            cellId === null &&
            isValidExchange(give, receive, (amounts) =>
              q.player.canAfford(input.playerId, amounts),
            )
          );
        }
        if (spaceId === "mosaicBench") return true;
        return (
          totalResources(give) === 0 &&
          totalResources(receive) === 0 &&
          itemType === null &&
          cellId === null
        );
      },
    },
    {
      id: "legal-craft",
      errorCode: "INVALID_CRAFT",
      validate: ({ state, input, q }) => {
        const { spaceId, give, receive, itemType, cellId } = input.params;
        if (spaceId !== "mosaicBench") return true;
        return (
          totalResources(give) === 0 &&
          totalResources(receive) === 0 &&
          itemType !== null &&
          cellId !== null &&
          q.player.canAfford(input.playerId, ITEMS[itemType].cost) &&
          legalCraftCells(state, input.playerId, itemType).includes(cellId)
        );
      },
    },
  ],
  reduce({ state, input, accept, edit, fx, q }) {
    const { workerId, spaceId, give, receive, itemType, cellId } = input.params;
    const playerId = input.playerId;
    const tx = edit(state);
    tx.moveComponentToSpace({
      componentId: workerId,
      boardId: "action-board",
      spaceId: spaceId as (typeof ACTION_SPACE_IDS)[number],
    });
    const workerLocations = {
      ...state.publicState.workerLocations,
      [workerId]: spaceId,
    };
    const events: GameEvent[] = [
      ...state.publicState.events,
      {
        kind: "workerPlaced" as const,
        season: state.publicState.season,
        playerId,
        workerId,
        spaceId,
      },
    ];
    if (spaceId === "timberYard") {
      tx.addResources({ playerId, amounts: { wood: 2 } });
      events.push({
        kind: "resourcesGained",
        season: state.publicState.season,
        playerId,
        amounts: { wood: 2, stone: 0, coin: 0 },
      });
    } else if (spaceId === "stoneYard") {
      tx.addResources({ playerId, amounts: { stone: 2 } });
      events.push({
        kind: "resourcesGained",
        season: state.publicState.season,
        playerId,
        amounts: { wood: 0, stone: 2, coin: 0 },
      });
    } else if (spaceId === "patronSquare") {
      tx.addResources({ playerId, amounts: { coin: 3 } });
      events.push({
        kind: "resourcesGained",
        season: state.publicState.season,
        playerId,
        amounts: { wood: 0, stone: 0, coin: 3 },
      });
    } else if (spaceId === "exchangeHouse") {
      tx.spendResources({ playerId, amounts: give });
      tx.addResources({ playerId, amounts: receive });
      events.push({
        kind: "resourcesExchanged",
        season: state.publicState.season,
        playerId,
        give,
        receive,
      });
    } else if (spaceId === "mosaicBench" && itemType && cellId) {
      tx.spendResources({ playerId, amounts: ITEMS[itemType].cost });
      events.push({
        kind: "itemCrafted",
        season: state.publicState.season,
        playerId,
        itemType,
        cellId,
      });
    }

    const tableauByPlayer =
      spaceId === "mosaicBench" && itemType && cellId
        ? {
            ...state.publicState.tableauByPlayer,
            [playerId]: {
              ...state.publicState.tableauByPlayer[playerId],
              [cellId]: itemType,
            },
          }
        : state.publicState.tableauByPlayer;
    const afterPlacement = {
      ...tx.state,
      publicState: {
        ...tx.state.publicState,
        workerLocations,
        tableauByPlayer,
        events,
      },
    };
    const playerIds = q.player.order() as readonly PlayerId[];
    const opponent = otherPlayer(playerIds, playerId);
    const participates = (candidate: PlayerId) =>
      !afterPlacement.publicState.passedPlayerIds.includes(candidate) &&
      unusedWorkers(afterPlacement, candidate).length > 0;
    const nextPlayer = participates(opponent)
      ? opponent
      : participates(playerId)
        ? playerId
        : null;
    const nextTx = edit(afterPlacement);
    nextTx.patchPublicState({ activePlayerId: nextPlayer });
    return accept(nextTx.state, {
      ...(nextPlayer === null
        ? { instructions: [fx.transition("cleanup")] }
        : {}),
    });
  },
});

const passPlacement = placementAuthoring.interaction({
  inputs: {},
  reduce({ state, input, accept, edit, fx, q }) {
    const playerId = input.playerId;
    const passedPlayerIds = [...state.publicState.passedPlayerIds, playerId];
    const events = [
      ...state.publicState.events,
      {
        kind: "playerPassed" as const,
        season: state.publicState.season,
        playerId,
      },
    ];
    const opponent = otherPlayer(q.player.order(), playerId);
    const nextPlayer =
      !passedPlayerIds.includes(opponent) &&
      unusedWorkers(state, opponent).length > 0
        ? opponent
        : null;
    const tx = edit(state);
    tx.patchPublicState({
      passedPlayerIds,
      events,
      activePlayerId: nextPlayer,
    });
    return accept(tx.state, {
      ...(nextPlayer === null
        ? { instructions: [fx.transition("cleanup")] }
        : {}),
    });
  },
});

export const placement = placementAuthoring.define({
  kind: "player",
  initialState: () => ({}),
  actor: ({ state }) => state.publicState.activePlayerId,
  interactions: { placeWorker, passPlacement },
});
