import game from "../../app/game.ts";
import type { GameState, PublicState } from "../../app/game-contract.ts";
import { createReducerBundle } from "@dreamboard-games/sdk/reducer";
import type { JsonValue } from "@dreamboard-games/sdk/types";
import { createInitialTable } from "../../shared/manifest-contract.ts";

export const PLAYER_IDS = ["player-1"] as const;
export type PlayerId = (typeof PLAYER_IDS)[number];

export async function bootstrap() {
  const bundle = createReducerBundle(game);
  const table = createInitialTable({ playerIds: [...PLAYER_IDS] });
  const state = await bundle.initialize({
    table: table as unknown as JsonValue,
    playerIds: [...PLAYER_IDS],
    rngSeed: 42,
    setup: { profileId: "standard", optionValues: {} },
  });
  return { bundle, state };
}

export type BootstrapResult = Awaited<ReturnType<typeof bootstrap>>;
export type SoloBundle = BootstrapResult["bundle"];
export type SoloState = BootstrapResult["state"];
export type SoloInput = Parameters<SoloBundle["dispatch"]>[0]["input"];

export function repairInput(
  beaconId: "beacon-north" | "beacon-harbor" | "beacon-south" = "beacon-north",
  playerId: PlayerId = "player-1",
): SoloInput {
  return {
    kind: "interaction",
    interactionId: "repairBeacon",
    playerId,
    params: { beaconId },
  } satisfies SoloInput;
}

export async function dispatchOrThrow(
  bundle: SoloBundle,
  state: SoloState,
  input: SoloInput,
): Promise<SoloState> {
  const result = await bundle.dispatch({ state, input });
  if (result.kind !== "accept") {
    throw new Error(`dispatch rejected: ${JSON.stringify(result, null, 2)}`);
  }
  return result.state;
}

export async function repair(
  runtime: { bundle: SoloBundle; state: SoloState },
  beaconId: "beacon-north" | "beacon-harbor" | "beacon-south" = "beacon-north",
): Promise<SoloState> {
  return dispatchOrThrow(runtime.bundle, runtime.state, repairInput(beaconId));
}

export function domain(state: SoloState): GameState {
  return state.domain as unknown as GameState;
}

export function phase(state: SoloState): string {
  return domain(state).flow.currentPhase;
}

export function publicState(state: SoloState): PublicState {
  return domain(state).publicState;
}

export function playerOrder(state: SoloState): readonly string[] {
  return domain(state).table.playerOrder;
}

export function patchPublicState(
  state: SoloState,
  patch: Partial<PublicState>,
): SoloState {
  return {
    ...state,
    domain: {
      ...domain(state),
      publicState: {
        ...domain(state).publicState,
        ...patch,
      },
    },
  } as unknown as SoloState;
}
