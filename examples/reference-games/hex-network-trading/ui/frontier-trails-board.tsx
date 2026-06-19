import React, { useMemo } from "react";
import type { PlayerId } from "@dreamboard/manifest-contract";
import { Board, type GameView } from "../shared/generated/ui-contract.ts";
import type { FrontierBoardSurface } from "./types";
import {
  ACCENT_RED,
  HAND_FONT,
  PAPER,
  PAPER_MUTED,
  PENCIL,
  PORT_ACCENT,
  PORT_LABEL,
  PORT_TINT,
  POSTIT,
  TERRAIN_THEME,
} from "./board/theme";
import {
  FRONTIER_TRAILS_HEX_SIZE,
  FRONTIER_TRAILS_INITIAL_ZOOM,
  PORT_BADGE_OCEAN_OFFSET,
  SECTOR,
  SPACE_KINDS,
  TILE_INNER_INSET,
  TILE_OUTER_INSET,
  seededRotation,
  spaceKind,
  starPoints,
} from "./board/geometry";

type PlayerInfoById = ReadonlyMap<PlayerId, { readonly color?: string }>;

export interface FrontierTrailsBoardProps {
  board: FrontierBoardSurface;
  view: GameView;
  players: PlayerInfoById;
  controllingPlayerId: PlayerId | null;
  isMyTurn: boolean;
  gameplayPhase: string | null;
}

export function FrontierTrailsBoard({
  board,
  view,
  players,
  controllingPlayerId,
  isMyTurn,
  gameplayPhase,
}: FrontierTrailsBoardProps) {
  const staticBoard = view.board;
  const boardEdges = (staticBoard?.edges ?? []).filter((edge) =>
    edge.spaceIds.some((id) => SPACE_KINDS[id] === "land"),
  );

  const boardVertices = (staticBoard?.vertices ?? []).filter((vertex) =>
    vertex.spaceIds.some((id) => SPACE_KINDS[id] === "land"),
  );

  const portsByEdge = view.portsByEdgeId;
  const portEndpointsByVertex: Record<string, string> = {};
  for (const edge of boardEdges) {
    const portType = portsByEdge[edge.id];
    if (!portType) continue;

    for (const vertex of boardVertices) {
      const touchesRelayEdge = edge.spaceIds.every((spaceId) =>
        vertex.spaceIds.includes(spaceId),
      );
      if (touchesRelayEdge) {
        portEndpointsByVertex[vertex.id] = portType;
      }
    }
  }

  const coloniesByVertex = view.coloniesByVertexId;
  const trailsByEdge = view.trailsByEdgeId;
  const spacesById = useMemo(
    () =>
      new Map<string, GameView["spaces"][number]>(
        view.spaces.map((space) => [space.id, space]),
      ),
    [view.spaces],
  );
  const stormActive =
    view.stormPending && view.discardPending.length === 0 && isMyTurn;
  const setupPlacedCamp = view.setup?.placedCamp ?? false;
  const showInteractiveVertices = gameplayPhase !== "setup" || !setupPlacedCamp;
  const showInteractiveEdges = gameplayPhase !== "setup" || setupPlacedCamp;

  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden rounded-2xl bg-[#fdfbf7] bg-[radial-gradient(rgba(45,45,45,0.15)_1px,transparent_1px)] bg-[length:24px_24px] shadow-[0_12px_30px_-14px_rgba(45,45,45,0.22),inset_0_0_0_1px_rgba(45,45,45,0.08)]">
      <board.Root>
        <Board.HexGrid
          board={SECTOR}
          spaces={view.spaces}
          width="100%"
          height="100%"
          hexSize={FRONTIER_TRAILS_HEX_SIZE}
          enablePanZoom
          initialZoom={FRONTIER_TRAILS_INITIAL_ZOOM}
          interactiveVertexSize={14}
          interactiveEdgeSize={14}
          className="h-full w-full"
          renderInteractiveSpace={(_space, state) => {
            if (!state.selectable || state.kind !== "space") return null;
            return (
              <circle
                r={FRONTIER_TRAILS_HEX_SIZE * 0.72}
                fill="none"
                stroke={ACCENT_RED}
                strokeWidth={state.hovered ? 3.6 : 2.4}
                strokeDasharray="6 5"
                className="pointer-events-none"
              />
            );
          }}
          renderTile={(tile, geometry) => {
            const space = spacesById.get(tile.id);
            if (!space) return null;
            const terrain = space.terrain;
            const numberToken = space.numberToken;

            const outerPoints = geometry.points({
              inset: TILE_OUTER_INSET,
            });
            const innerPoints = geometry.points({
              inset: TILE_INNER_INSET,
            });

            if (terrain === "borderland") {
              // Muted paper margin. A few low-contrast pencil dots keep
              // the "star map" flavour without pulling focus from the
              // land tiles or from the port sticky notes that sit here.
              const stars = starPoints(tile.id, 4, 30);
              return (
                <g className="pointer-events-none">
                  <polygon
                    points={outerPoints}
                    fill={PAPER_MUTED}
                    stroke={`${PENCIL}1f`}
                    strokeWidth={1.2}
                  />
                  {stars.map((star, index) => (
                    <circle
                      key={index}
                      cx={star.x}
                      cy={star.y}
                      r={star.r}
                      fill={PENCIL}
                      opacity={0.22}
                    />
                  ))}
                </g>
              );
            }

            const theme = TERRAIN_THEME[terrain];
            const isStormHere = tile.id === view.stormSpaceId;
            const tokenRotation = seededRotation(tile.id, 7, 4);

            return (
              <g>
                <polygon
                  points={outerPoints}
                  fill={theme.fill}
                  stroke={PENCIL}
                  strokeWidth={2.2}
                  strokeLinejoin="round"
                />
                <polygon
                  points={innerPoints}
                  fill={theme.inner}
                  opacity={0.75}
                />
                <text
                  y={-16}
                  textAnchor="middle"
                  fontSize={20}
                  className="pointer-events-none"
                >
                  {theme.icon}
                </text>
                <text
                  y={29}
                  textAnchor="middle"
                  fontSize={7}
                  fill={PENCIL}
                  fontWeight="700"
                  letterSpacing="0.14em"
                  fontFamily={HAND_FONT}
                  opacity={0.7}
                  className="pointer-events-none"
                >
                  {theme.label.toUpperCase()}
                </text>
                {numberToken != null && (
                  <g
                    className="pointer-events-none"
                    transform={`rotate(${tokenRotation})`}
                  >
                    {/* Hard offset shadow — flat pencil-black, zero blur */}
                    <circle cx={2} cy={2} r={14} fill={PENCIL} opacity={0.9} />
                    <circle
                      r={14}
                      fill={POSTIT}
                      stroke={PENCIL}
                      strokeWidth={1.8}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={14}
                      fontWeight="bold"
                      fontFamily={HAND_FONT}
                      fill={PENCIL}
                    >
                      {numberToken}
                    </text>
                  </g>
                )}
                {isStormHere && (
                  <g className="pointer-events-none">
                    <circle cx={2} cy={43} r={11} fill={PENCIL} opacity={0.9} />
                    <circle
                      cy={41}
                      r={11}
                      fill={POSTIT}
                      stroke={PENCIL}
                      strokeWidth={1.8}
                    />
                    <text y={44} textAnchor="middle" fontSize={12}>
                      ☄️
                    </text>
                  </g>
                )}
              </g>
            );
          }}
          renderEdge={(edge, position) => {
            const trail = trailsByEdge[edge.id];
            const portType = portsByEdge[edge.id];
            if (!trail && !portType) return null;
            const trailColor = trail
              ? (players.get(trail.ownerId)?.color ?? "#fff")
              : "#fff";
            const portLabel = portType
              ? (PORT_LABEL[portType] ?? portType)
              : null;
            const portTint = portType
              ? (PORT_TINT[portType] ?? POSTIT)
              : POSTIT;
            const portAccent = portType
              ? (PORT_ACCENT[portType] ?? PENCIL)
              : PENCIL;
            const [firstSpaceId, secondSpaceId] = [edge.hex1, edge.hex2];
            const borderlandDirection =
              secondSpaceId && spaceKind(secondSpaceId) === "borderland"
                ? 1
                : firstSpaceId && spaceKind(firstSpaceId) === "borderland"
                  ? -1
                  : 0;
            const borderlandAngleRad = (position.centerAngle * Math.PI) / 180;
            const portBadgeX =
              position.midX +
              Math.cos(borderlandAngleRad) *
                borderlandDirection *
                PORT_BADGE_OCEAN_OFFSET;
            const portBadgeY =
              position.midY +
              Math.sin(borderlandAngleRad) *
                borderlandDirection *
                PORT_BADGE_OCEAN_OFFSET;
            const noteRotation = portType ? seededRotation(edge.id, 3, 7) : 0;
            return (
              <g>
                {portType && portLabel && (
                  <g data-port-edge={edge.id} className="pointer-events-none">
                    {/* Pencil tick from edge midpoint out to the sticky note */}
                    <line
                      x1={position.midX}
                      y1={position.midY}
                      x2={portBadgeX}
                      y2={portBadgeY}
                      stroke={PENCIL}
                      strokeOpacity={0.55}
                      strokeWidth={1.2}
                      strokeDasharray="3 2"
                      strokeLinecap="round"
                    />
                    {/* Sticky note: hard offset shadow + rotated paper */}
                    <g
                      transform={`translate(${portBadgeX} ${portBadgeY}) rotate(${noteRotation})`}
                    >
                      <rect
                        x={-20 + 2}
                        y={-14 + 2}
                        width={40}
                        height={28}
                        rx={3}
                        fill={PENCIL}
                        opacity={0.9}
                      />
                      <rect
                        x={-20}
                        y={-14}
                        width={40}
                        height={28}
                        rx={3}
                        fill={portTint}
                        stroke={PENCIL}
                        strokeWidth={1.8}
                      />
                      {portType === "3:1" ? (
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          y={1}
                          fontSize={13}
                          fontWeight="bold"
                          fontFamily={HAND_FONT}
                          fill={PENCIL}
                        >
                          {portLabel}
                        </text>
                      ) : (
                        <>
                          <text
                            textAnchor="middle"
                            y={-2}
                            fontSize={11}
                            fontWeight="bold"
                            fontFamily={HAND_FONT}
                            fill={PENCIL}
                          >
                            {portLabel}
                          </text>
                          <text
                            textAnchor="middle"
                            y={9}
                            fontSize={8}
                            fontFamily={HAND_FONT}
                            fill={portAccent}
                          >
                            2:1
                          </text>
                        </>
                      )}
                    </g>
                  </g>
                )}
                {trail && (
                  <rect
                    x={position.midX - 19}
                    y={position.midY - 4.5}
                    width={38}
                    height={9}
                    rx={3}
                    transform={`rotate(${position.edgeAngle} ${position.midX} ${position.midY})`}
                    fill={trailColor}
                    stroke={PENCIL}
                    strokeWidth={1.6}
                  />
                )}
              </g>
            );
          }}
          renderVertex={(vertex, position) => {
            const building = coloniesByVertex[vertex.id];
            const portType = portEndpointsByVertex[vertex.id];
            const portAccent = portType
              ? (PORT_ACCENT[portType] ?? PENCIL)
              : null;

            if (!building) {
              // Tiny resource-coloured mark on port-adjacent vertices so
              // the "which two corners belong to this port" relationship
              // is still legible without the old ring halos.
              if (portAccent) {
                return (
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={2.8}
                    fill={portAccent}
                    stroke={PENCIL}
                    strokeWidth={0.8}
                    className="pointer-events-none"
                  />
                );
              }
              return null;
            }

            const color = players.get(building.ownerId)?.color ?? "#fff";
            const isTown = building.kind === "town";

            if (isTown) {
              const rotation = seededRotation(vertex.id, 5, 8);
              return (
                <g
                  transform={`translate(${position.x} ${position.y}) rotate(${rotation})`}
                >
                  <rect
                    x={-9 + 1.5}
                    y={-9 + 1.5}
                    width={18}
                    height={18}
                    rx={2}
                    fill={PENCIL}
                    opacity={0.85}
                  />
                  <rect
                    x={-9}
                    y={-9}
                    width={18}
                    height={18}
                    rx={2}
                    fill={color}
                    stroke={PENCIL}
                    strokeWidth={2}
                  />
                </g>
              );
            }

            return (
              <g>
                <circle
                  cx={position.x + 1.5}
                  cy={position.y + 1.5}
                  r={7}
                  fill={PENCIL}
                  opacity={0.85}
                />
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={7}
                  fill={color}
                  stroke={PENCIL}
                  strokeWidth={1.8}
                />
              </g>
            );
          }}
          renderInteractiveEdge={(edge, position, state) => {
            if (
              !showInteractiveEdges ||
              !state.selectable ||
              state.kind !== "edge"
            ) {
              return null;
            }
            const trail = trailsByEdge[edge.id];
            if (trail) return null;
            const color =
              controllingPlayerId == null
                ? POSTIT
                : (players.get(controllingPlayerId)?.color ?? POSTIT);
            const transform = `rotate(${position.edgeAngle} ${position.midX} ${position.midY})`;
            if (state.hovered) {
              return (
                <rect
                  x={position.midX - 19}
                  y={position.midY - 4.5}
                  width={38}
                  height={9}
                  rx={3}
                  transform={transform}
                  fill={color}
                  stroke={PENCIL}
                  strokeWidth={1.6}
                />
              );
            }
            // Rest state: a faint pencil dash along the edge — a
            // designer's "you could build here" tick, not a shout.
            return (
              <line
                x1={position.midX - 12}
                y1={position.midY}
                x2={position.midX + 12}
                y2={position.midY}
                transform={transform}
                stroke={PENCIL}
                strokeOpacity={0.28}
                strokeWidth={1.4}
                strokeDasharray="3 3"
                strokeLinecap="round"
              />
            );
          }}
          renderInteractiveVertex={(_vertex, position, state) => {
            if (
              !showInteractiveVertices ||
              !state.selectable ||
              state.kind !== "vertex"
            ) {
              return null;
            }
            if (state.hovered) {
              return (
                <g className="pointer-events-none">
                  <circle
                    cx={position.x + 1.5}
                    cy={position.y + 1.5}
                    r={10}
                    fill={PENCIL}
                    opacity={0.85}
                  />
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={10}
                    fill={POSTIT}
                    stroke={PENCIL}
                    strokeWidth={2}
                  />
                </g>
              );
            }
            // Rest state: a small hollow pencil tick. Readable but
            // recedes behind the land tiles and built pieces.
            return (
              <circle
                cx={position.x}
                cy={position.y}
                r={3}
                fill={PAPER}
                stroke={PENCIL}
                strokeWidth={1.3}
                className="pointer-events-none"
              />
            );
          }}
        />
      </board.Root>
    </div>
  );
}
