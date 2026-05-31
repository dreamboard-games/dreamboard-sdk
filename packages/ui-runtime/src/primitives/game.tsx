import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PlayerId } from "@dreamboard/manifest-contract";
import { useStore } from "zustand";
import {
  useInteractionUiStore,
  usePendingInteractionKey,
} from "../context/InteractionDraftContext.js";
import { usePluginState } from "../context/PluginStateContext.js";
import { usePluginSession } from "../context/PluginSessionContext.js";
import { useActivePlayers } from "../hooks/useActivePlayers.js";
import { useGameView } from "../hooks/useGameView.js";
import { usePlayerInfo } from "../hooks/usePlayerInfo.js";
import { usePlayerTurnOrder } from "../hooks/usePlayerTurnOrder.js";
import type {
  InputDomain,
  InteractionDescriptor,
  InteractionInputDescriptor,
} from "../types/plugin-state.js";
import type { Player } from "@dreamboard-games/ui-sdk/types/player-state";
import { interactionLabel } from "../utils/interaction-labels.js";
import {
  clearInteractionRoute,
  getInteractionDraftReadiness,
} from "../utils/interaction-router.js";

export type GamePlayer<PlayerIdValue extends string = PlayerId> = Omit<
  Player,
  "playerId"
> & {
  playerId: PlayerIdValue;
};

export type GamePlayerEntry<PlayerIdValue extends string = PlayerId> =
  GamePlayer<PlayerIdValue> & {
    index: number;
    isActive: boolean;
    isCurrentPlayer: boolean;
    isControllable: boolean;
  };

export interface GamePlayersState<PlayerIdValue extends string = PlayerId> {
  byId: ReadonlyMap<PlayerIdValue, GamePlayer<PlayerIdValue>>;
  order: readonly PlayerIdValue[];
  entries: ReadonlyArray<GamePlayerEntry<PlayerIdValue>>;
  active: readonly PlayerIdValue[];
  current: GamePlayer<PlayerIdValue> | null;
}

export interface GameMeState<PlayerIdValue extends string = PlayerId> {
  playerId: PlayerIdValue | null;
  player: GamePlayer<PlayerIdValue> | null;
  controllablePlayerIds: readonly PlayerIdValue[];
  canAct: boolean;
}

export interface GameTurnState<
  PlayerIdValue extends string = PlayerId,
  PhaseValue extends string = string,
> {
  phase: PhaseValue | null;
  stage: string | null;
  activePlayerIds: readonly PlayerIdValue[];
  currentPlayerId: PlayerIdValue | null;
  order: readonly PlayerIdValue[];
  isMine: boolean;
}

export interface GameRenderState<
  ViewValue = unknown,
  PlayerIdValue extends string = PlayerId,
  PhaseValue extends string = string,
> {
  view: ViewValue;
  phase: PhaseValue | null;
  stage: string | null;
  session: ReturnType<typeof usePluginSession>;
  me: GameMeState<PlayerIdValue>;
  turn: GameTurnState<PlayerIdValue, PhaseValue>;
  players: GamePlayersState<PlayerIdValue>;
}

export interface GamePendingInputState {
  key: string;
  kind: string;
  domain: InputDomain;
  title: string;
}

export interface GameActiveActionState<
  Interaction extends string = string,
  Params extends Record<string, unknown> = Record<string, unknown>,
> {
  interaction: Interaction;
  interactionId: string;
  descriptor: InteractionDescriptor<Interaction>;
  title: string;
  draft: Readonly<Partial<Params>>;
  values: Partial<Params>;
  missingInputs: readonly string[];
  readyFrontier: readonly string[];
  pendingInput: GamePendingInputState | null;
}

export interface GameChromeState<
  ViewValue = unknown,
  PlayerIdValue extends string = PlayerId,
  PhaseValue extends string = string,
  Interaction extends string = string,
> extends GameRenderState<ViewValue, PlayerIdValue, PhaseValue> {
  activePlayers: readonly PlayerIdValue[];
  activeAction: GameActiveActionState<Interaction> | null;
  cancel: (() => void) | null;
}

export interface GameRootProps<
  ViewValue = unknown,
  PlayerIdValue extends string = PlayerId,
  PhaseValue extends string = string,
> {
  onActionError?: (error: unknown) => void;
  children: (
    state: GameRenderState<ViewValue, PlayerIdValue, PhaseValue>,
  ) => ReactNode;
}

export interface GameChromeProps<
  ViewValue = unknown,
  PlayerIdValue extends string = PlayerId,
  PhaseValue extends string = string,
  Interaction extends string = string,
> {
  children: (
    state: GameChromeState<ViewValue, PlayerIdValue, PhaseValue, Interaction>,
  ) => ReactNode;
}

type GameActionErrorHandler = (error: unknown) => void;

const GameActionErrorContext = createContext<GameActionErrorHandler | null>(
  null,
);

export function useGameActionError(): GameActionErrorHandler | null {
  return useContext(GameActionErrorContext);
}

function fallbackPlayer<PlayerIdValue extends string>(
  playerId: PlayerIdValue,
): GamePlayer<PlayerIdValue> {
  return {
    playerId,
    name: playerId,
  };
}

function useGameRenderState<
  ViewValue = unknown,
  PlayerIdValue extends string = PlayerId,
  PhaseValue extends string = string,
>(): GameRenderState<ViewValue, PlayerIdValue, PhaseValue> {
  const view = useGameView() as ViewValue;
  const session = usePluginSession();
  const playerInfo = usePlayerInfo();
  const activePlayers = useActivePlayers().map(
    (playerId) => playerId as PlayerIdValue,
  );
  const turnOrder = usePlayerTurnOrder().map(
    (playerId) => playerId as PlayerIdValue,
  );
  const phase = usePluginState(
    (state) => state.gameplay.currentPhase,
  ) as PhaseValue | null;
  const stage = usePluginState((state) => state.gameplay.currentStage);

  const playersById = useMemo(() => {
    const next = new Map<PlayerIdValue, GamePlayer<PlayerIdValue>>();
    playerInfo.forEach((player, key) => {
      const playerId = key as PlayerIdValue;
      next.set(playerId, {
        ...player,
        playerId,
      });
    });
    return next;
  }, [playerInfo]);

  const controllingPlayerId =
    session.controllingPlayerId == null
      ? null
      : (session.controllingPlayerId as PlayerIdValue);
  const controllablePlayerIds = session.controllablePlayerIds.map(
    (playerId) => playerId as PlayerIdValue,
  );
  const currentPlayerId = activePlayers[0] ?? turnOrder[0] ?? null;
  const currentPlayer = currentPlayerId
    ? (playersById.get(currentPlayerId) ?? fallbackPlayer(currentPlayerId))
    : null;
  const mePlayer = controllingPlayerId
    ? (playersById.get(controllingPlayerId) ??
      fallbackPlayer(controllingPlayerId))
    : null;

  const entries = useMemo<ReadonlyArray<GamePlayerEntry<PlayerIdValue>>>(
    () =>
      turnOrder.map((playerId, index) => {
        const player = playersById.get(playerId) ?? fallbackPlayer(playerId);
        return {
          ...player,
          index,
          isActive: activePlayers.includes(playerId),
          isCurrentPlayer: playerId === controllingPlayerId,
          isControllable: controllablePlayerIds.includes(playerId),
        };
      }),
    [
      activePlayers,
      controllablePlayerIds,
      controllingPlayerId,
      playersById,
      turnOrder,
    ],
  );

  return {
    view,
    phase,
    stage,
    session,
    me: {
      playerId: controllingPlayerId,
      player: mePlayer,
      controllablePlayerIds,
      canAct:
        controllingPlayerId != null &&
        activePlayers.includes(controllingPlayerId),
    },
    turn: {
      phase,
      stage,
      activePlayerIds: activePlayers,
      currentPlayerId,
      order: turnOrder,
      isMine:
        controllingPlayerId != null &&
        activePlayers.includes(controllingPlayerId),
    },
    players: {
      byId: playersById,
      order: turnOrder,
      entries,
      active: activePlayers,
      current: currentPlayer,
    },
  };
}

export function GameRoot<
  ViewValue = unknown,
  PlayerIdValue extends string = PlayerId,
  PhaseValue extends string = string,
>({
  children,
  onActionError,
}: GameRootProps<ViewValue, PlayerIdValue, PhaseValue>) {
  const state = useGameRenderState<ViewValue, PlayerIdValue, PhaseValue>();

  const rendered = <>{children(state)}</>;
  if (!onActionError) return rendered;
  return (
    <GameActionErrorContext.Provider value={onActionError}>
      {rendered}
    </GameActionErrorContext.Provider>
  );
}

export function GameChrome<
  ViewValue = unknown,
  PlayerIdValue extends string = PlayerId,
  PhaseValue extends string = string,
  Interaction extends string = string,
>({
  children,
}: GameChromeProps<ViewValue, PlayerIdValue, PhaseValue, Interaction>) {
  const renderState = useGameRenderState<
    ViewValue,
    PlayerIdValue,
    PhaseValue
  >();
  const store = useInteractionUiStore();
  const pendingInteractionKey = usePendingInteractionKey();
  const draftSnapshot = useStore(store, (state) => state.drafts);
  const armSnapshot = useStore(store, (state) => state.arms);
  const descriptor = usePluginState((state) =>
    pendingInteractionKey
      ? state.gameplay.availableInteractions.find(
          (candidate) => candidate.interactionKey === pendingInteractionKey,
        )
      : undefined,
  );

  const activeAction =
    useMemo<GameActiveActionState<Interaction> | null>(() => {
      if (!descriptor) return null;
      const draft = store.getDraft(descriptor.interactionKey);
      const readiness = getInteractionDraftReadiness(descriptor, draft);
      const pendingInputKey =
        readiness.readyFrontier[0] ?? readiness.missingInputs[0] ?? null;
      const pendingInput = pendingInputKey
        ? descriptor.inputs.find((input) => input.key === pendingInputKey)
        : undefined;
      return {
        interaction: descriptor.interactionKey as Interaction,
        interactionId: descriptor.interactionId,
        descriptor: descriptor as InteractionDescriptor<Interaction>,
        title: interactionLabel(descriptor),
        draft,
        values: readiness.values,
        missingInputs: readiness.missingInputs,
        readyFrontier: readiness.readyFrontier,
        pendingInput: pendingInput ? pendingInputState(pendingInput) : null,
      };
    }, [descriptor, draftSnapshot, armSnapshot, store]);

  const cancel = useMemo(
    () =>
      descriptor
        ? () => {
            clearInteractionRoute(store, descriptor);
          }
        : null,
    [descriptor, store],
  );

  return (
    <>
      {children({
        ...renderState,
        activePlayers: renderState.turn.activePlayerIds,
        activeAction,
        cancel,
      })}
    </>
  );
}

function pendingInputState(
  input: InteractionInputDescriptor,
): GamePendingInputState {
  return {
    key: input.key,
    kind: input.kind,
    domain: input.domain,
    title: pendingInputTitle(input),
  };
}

function pendingInputTitle(input: InteractionInputDescriptor): string {
  switch (input.kind) {
    case "card":
      return "Choose a card";
    case "board-space":
      return "Choose a board space";
    case "board-edge":
      return "Choose a board edge";
    case "board-vertex":
      return "Choose a board vertex";
    case "board-tile":
      return "Choose a board tile";
    default:
      return `Choose ${humanizeInputKey(input.key)}`;
  }
}

function humanizeInputKey(key: string): string {
  return key
    .replace(/Id$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export const Game = {
  Root: GameRoot,
  Chrome: GameChrome,
};
