import {
  createContext,
  Fragment,
  useContext,
  useMemo,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import type { PlayerId } from "@dreamboard/manifest-contract";
import { useActivePlayers } from "../hooks/useActivePlayers.js";
import { usePlayerInfo } from "../hooks/usePlayerInfo.js";
import { usePlayerTurnOrder } from "../hooks/usePlayerTurnOrder.js";
import { usePluginSession } from "../context/PluginSessionContext.js";
import {
  renderPrimitive,
  type PrimitiveCommonProps,
} from "../../ui/primitives/primitive-props.js";
import type { HexColor } from "../../ui.js";

export interface PlayerRosterBadge {
  key: string;
  label?: ReactNode;
  icon?: ReactNode;
  tooltip?: string;
}

export interface PlayerRosterEntry {
  playerId: PlayerId;
  name: string;
  color?: HexColor;
  index: number;
  isActive: boolean;
  isCurrentPlayer: boolean;
  isControllable: boolean;
  canSwitchToPlayer: boolean;
  score?: number;
  scoreLabel?: string;
  badges: readonly PlayerRosterBadge[];
  metadata?: Record<string, unknown>;
}

export interface PlayerRosterRootProps {
  children: ReactNode;
  order?: "turn" | "self-first";
  include?: "all" | "self" | "opponents";
  score?: (playerId: PlayerId) => number | undefined;
  scoreLabel?: string | ((playerId: PlayerId) => string | undefined);
  badges?: (
    playerId: PlayerId,
  ) => ReadonlyArray<PlayerRosterBadge | null | false | undefined>;
  metadata?: (playerId: PlayerId) => Record<string, unknown> | undefined;
}

interface PlayerRosterContextValue {
  players: readonly PlayerRosterEntry[];
}

const PlayerRosterContext = createContext<PlayerRosterContextValue | null>(
  null,
);

function usePlayerRosterContext(): PlayerRosterContextValue {
  const value = useContext(PlayerRosterContext);
  if (!value) {
    throw new Error(
      "PlayerRoster primitives must be rendered inside <PlayerRoster.Root>.",
    );
  }
  return value;
}

function projectBadges(
  badges: PlayerRosterRootProps["badges"],
  playerId: PlayerId,
): readonly PlayerRosterBadge[] {
  return (badges?.(playerId) ?? []).filter(
    (badge): badge is PlayerRosterBadge => Boolean(badge),
  );
}

export function PlayerRosterRoot({
  children,
  order = "turn",
  include = "all",
  score,
  scoreLabel,
  badges,
  metadata,
}: PlayerRosterRootProps) {
  const playerInfo = usePlayerInfo();
  const activePlayers = useActivePlayers();
  const turnOrder = usePlayerTurnOrder();
  const { controllingPlayerId, controllablePlayerIds } = usePluginSession();

  const players = useMemo<readonly PlayerRosterEntry[]>(() => {
    const orderedPlayerIds =
      order === "self-first" && controllingPlayerId
        ? [
            ...turnOrder.filter((pid) => pid === controllingPlayerId),
            ...turnOrder.filter((pid) => pid !== controllingPlayerId),
          ]
        : turnOrder;

    return orderedPlayerIds
      .map((playerId, index): PlayerRosterEntry => {
        const player = playerInfo.get(playerId);
        const isCurrentPlayer = playerId === controllingPlayerId;
        const isControllable = controllablePlayerIds.includes(playerId);
        const resolvedScoreLabel =
          typeof scoreLabel === "function" ? scoreLabel(playerId) : scoreLabel;

        return {
          playerId,
          name: player?.name ?? playerId,
          color: player?.color,
          index,
          isActive: activePlayers.includes(playerId),
          isCurrentPlayer,
          isControllable,
          canSwitchToPlayer:
            controllablePlayerIds.length > 1 &&
            isControllable &&
            !isCurrentPlayer,
          score: score?.(playerId),
          scoreLabel: resolvedScoreLabel,
          badges: projectBadges(badges, playerId),
          metadata: metadata?.(playerId),
        };
      })
      .filter((player) => {
        if (include === "self") return player.isCurrentPlayer;
        if (include === "opponents") return !player.isCurrentPlayer;
        return true;
      });
  }, [
    activePlayers,
    badges,
    controllablePlayerIds,
    controllingPlayerId,
    include,
    metadata,
    order,
    playerInfo,
    score,
    scoreLabel,
    turnOrder,
  ]);

  const value = useMemo<PlayerRosterContextValue>(
    () => ({ players }),
    [players],
  );

  return (
    <PlayerRosterContext.Provider value={value}>
      {children}
    </PlayerRosterContext.Provider>
  );
}

export type PlayerRosterListProps = Omit<PrimitiveCommonProps, "children"> &
  Omit<HTMLAttributes<HTMLElement>, "children"> & {
    children?: (player: PlayerRosterEntry) => ReactNode;
  };

export function PlayerRosterList({
  children,
  ...props
}: PlayerRosterListProps) {
  const { players } = usePlayerRosterContext();
  return renderPrimitive("div", {
    ...props,
    "data-dreamboard-player-roster-list": "",
    children: players.map((player) => (
      <Fragment key={player.playerId}>
        {children ? children(player) : <PlayerRosterName player={player} />}
      </Fragment>
    )),
  });
}

export function PlayerRosterEmpty({ children }: { children?: ReactNode }) {
  const { players } = usePlayerRosterContext();
  if (players.length > 0) return null;
  return <>{children}</>;
}

export type PlayerRosterPartProps = PrimitiveCommonProps &
  HTMLAttributes<HTMLElement> & {
    player: PlayerRosterEntry;
  };

export interface PlayerRosterComponents {
  Root(props: PlayerRosterRootProps): ReactElement | null;
  List(props: PlayerRosterListProps): ReactElement;
  Empty(props: { children?: ReactNode }): ReactElement | null;
  Name(props: PlayerRosterPartProps): ReactElement;
  Score(props: PlayerRosterPartProps): ReactElement | null;
  Badges(props: PlayerRosterPartProps): ReactElement | null;
}

export function PlayerRosterName({
  player,
  children,
  ...props
}: PlayerRosterPartProps) {
  return renderPrimitive("span", {
    ...props,
    "data-dreamboard-player-roster-name": "",
    children: children ?? player.name,
  });
}

export function PlayerRosterScore({
  player,
  children,
  ...props
}: PlayerRosterPartProps) {
  if (player.score === undefined && children === undefined) return null;
  const label = player.scoreLabel ? ` ${player.scoreLabel}` : "";
  return renderPrimitive("span", {
    ...props,
    "data-dreamboard-player-roster-score": "",
    children: children ?? `${player.score}${label}`,
  });
}

export function PlayerRosterBadges({
  player,
  children,
  ...props
}: PlayerRosterPartProps) {
  if (player.badges.length === 0 && children === undefined) return null;
  return renderPrimitive("span", {
    ...props,
    "data-dreamboard-player-roster-badges": "",
    children:
      children ??
      player.badges.map((badge) => (
        <span
          key={badge.key}
          data-dreamboard-player-roster-badge=""
          title={badge.tooltip}
          aria-label={badge.tooltip}
        >
          {badge.icon}
          {badge.label}
        </span>
      )),
  });
}

export const PlayerRoster: PlayerRosterComponents = {
  Root: PlayerRosterRoot,
  List: PlayerRosterList,
  Empty: PlayerRosterEmpty,
  Name: PlayerRosterName,
  Score: PlayerRosterScore,
  Badges: PlayerRosterBadges,
};
