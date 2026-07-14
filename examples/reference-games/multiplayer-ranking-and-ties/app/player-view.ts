import {
  definePlayerView,
  defineSharedView,
} from "@dreamboard-games/sdk/reducer";
import { cardById, type StallCard } from "./cards";
import type {
  GameContract,
  GameState,
  HarborOutcome,
  PlayerId,
  PublicEvent,
  StormId,
} from "./game-contract";
import { activePlayerId, legalMarketCardIds } from "./rules";

export type SharedHarborView = {
  readonly currentPhase: string;
  readonly round: number;
  readonly activePlayerId: PlayerId | null;
  readonly market: readonly (StallCard | null)[];
  readonly legalMarketCardIds: readonly string[];
  readonly festivalRows: Readonly<Record<string, readonly StallCard[]>>;
  readonly stormsRevealed: number;
  readonly stormHistory: readonly StormId[];
  readonly events: readonly PublicEvent[];
  readonly completed: boolean;
  readonly outcome: HarborOutcome | null;
};

export type HarborPlayerView = SharedHarborView & {
  readonly playerId: PlayerId;
  readonly isActivePlayer: boolean;
};

function projectShared(
  state: Pick<GameState, "flow" | "publicState">,
): SharedHarborView {
  const publicState = state.publicState;
  const active = publicState.completed ? null : activePlayerId(publicState);
  return {
    currentPhase: state.flow.currentPhase,
    round: publicState.round,
    activePlayerId: active,
    market: publicState.market.map((cardId) =>
      cardId === null ? null : (cardById[cardId] as StallCard),
    ),
    legalMarketCardIds: legalMarketCardIds(publicState),
    festivalRows: Object.fromEntries(
      publicState.playerIds.map((playerId) => [
        playerId,
        (publicState.festivalRows[playerId] ?? []).map(
          (cardId) => cardById[cardId] as StallCard,
        ),
      ]),
    ),
    stormsRevealed: publicState.stormsRevealed,
    stormHistory: publicState.stormHistory,
    events: publicState.events,
    completed: publicState.completed,
    outcome: publicState.outcome,
  };
}

export const sharedView = defineSharedView<GameContract>()({
  project({ state }) {
    return projectShared(state);
  },
});

export const playerView = definePlayerView<GameContract>()({
  project({ state, playerId }): HarborPlayerView {
    const shared = projectShared(state);
    return {
      ...shared,
      playerId,
      isActivePlayer: shared.activePlayerId === playerId,
    };
  },
});
