import type { ScenarioCommandOf } from "@dreamboard-games/sdk/testing";
import type { ItemType, ResourceMap } from "../../app/game-contract.ts";
import type { PieceId, SpaceId } from "../../shared/manifest-contract.ts";
import game from "../../app/game.ts";

type Command = ScenarioCommandOf<typeof game>;

export function place(
  seat: 0 | 1,
  workerId: PieceId,
  spaceId: SpaceId,
): Command {
  return {
    actor: { seat },
    interactionId: "placeWorker",
    params: {
      workerId,
      spaceId,
      give: {},
      receive: {},
      itemType: null,
      cellId: null,
    },
  };
}

export function exchange(
  seat: 0 | 1,
  workerId: PieceId,
  give: ResourceMap,
  receive: ResourceMap,
): Command {
  return {
    actor: { seat },
    interactionId: "placeWorker",
    params: {
      workerId,
      spaceId: "exchangeHouse",
      give,
      receive,
      itemType: null,
      cellId: null,
    },
  };
}

export function craft(
  seat: 0 | 1,
  workerId: PieceId,
  itemType: ItemType,
  cellId: SpaceId,
): Command {
  return {
    actor: { seat },
    interactionId: "placeWorker",
    params: {
      workerId,
      spaceId: "mosaicBench",
      give: {},
      receive: {},
      itemType,
      cellId,
    },
  };
}

export function pass(seat: 0 | 1): Command {
  return { actor: { seat }, interactionId: "passPlacement", params: {} };
}
