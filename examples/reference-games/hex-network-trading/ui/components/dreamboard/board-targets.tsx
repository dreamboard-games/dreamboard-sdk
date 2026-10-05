import type { RuntimeBoardTarget } from "@dreamboard-games/sdk";
import { useGame, useDropArea } from "@game";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type ComponentProps,
} from "react";
import "./tokens.css";
import type { GameModel as Model } from "@game";
type Board = ReturnType<Model["boards"]["getAll"]>[number];
type Layout = ReturnType<Board["getLayout"]>;
type Space = ReturnType<Layout["getSpaces"]>[number];
type Tile = ReturnType<Layout["getTiles"]>[number];
type Edge = ReturnType<Layout["getEdges"]>[number];
type DropTarget = Exclude<
  ReturnType<Model["drag"]["getDropTargets"]>[number],
  { kind: "interaction" }
>;
type DropRoute = Pick<
  DropTarget,
  "interactionKey" | "cardInputKey" | "inputKey"
>;
type Vertex = ReturnType<Layout["getVertices"]>[number];
export interface BoardTargetsProps {
  boardId: Parameters<Model["boards"]["get"]>[0];
  hexSize?: number;
  dropRoute?: DropRoute;
  label?: string;
  className?: string;
  renderTile?(tile: Tile): ReactNode;
  tileProps?(tile: Tile): ComponentProps<"path">;
  targetLabel?(target: Space | Edge | Vertex): string;
  renderSpace?(space: Space): ReactNode;
  renderEdge?(edge: Edge): ReactNode;
  renderVertex?(vertex: Vertex): ReactNode;
  spaceProps?(space: Space): ComponentProps<"polygon">;
  edgeProps?(edge: Edge): ComponentProps<"line">;
  vertexProps?(vertex: Vertex): ComponentProps<"circle">;
}
/** Canonical geometry with native keyboard controls over spaces, edges and vertices. */
export function BoardTargets({
  boardId,
  hexSize = 50,
  dropRoute,
  label = "Board",
  className = "",
  renderTile,
  tileProps,
  targetLabel,
  renderSpace,
  renderEdge,
  renderVertex,
  spaceProps,
  edgeProps,
  vertexProps,
}: BoardTargetsProps) {
  const board = useGame((game) => game.boards.find(boardId));
  // Board destinations only; games without card-only interactions have no others.
  const dropTargets = useGame((game) => game.drag.getDropTargets()).filter(
    (target): target is DropTarget => "inputKey" in target,
  );
  const viewport = useGame((game) => game.viewport);
  const surface = useRef<SVGSVGElement>(null);
  const [screenScale, setScreenScale] = useState(1);
  useEffect(() => {
    const node = surface.current;
    if (!node) return;
    const measure = () => {
      const matrix = node.getScreenCTM();
      if (matrix) setScreenScale(Math.hypot(matrix.a, matrix.b));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    return () => observer.disconnect();
  }, [board]);
  const pointer = viewport.getProps();
  const { onWheel } = pointer;
  function boardPoint(node: SVGSVGElement, clientX: number, clientY: number) {
    const point = node.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(node.getScreenCTM()!.inverse());
  }
  function pointerEvent(event: React.PointerEvent<SVGSVGElement>) {
    const point = boardPoint(event.currentTarget, event.clientX, event.clientY);
    return {
      pointerId: event.pointerId,
      button: event.button,
      clientX: point.x,
      clientY: point.y,
      currentTarget: event.currentTarget,
      preventDefault: () => event.preventDefault(),
    };
  }
  useEffect(() => {
    const node = surface.current;
    if (!node) return;
    const wheel = (event: WheelEvent) => {
      const point = boardPoint(node, event.clientX, event.clientY);
      onWheel({
        clientX: point.x,
        clientY: point.y,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        currentTarget: {
          setPointerCapture: (id) => node.setPointerCapture(id),
          hasPointerCapture: (id) => node.hasPointerCapture(id),
          releasePointerCapture: (id) => node.releasePointerCapture(id),
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            height: node.viewBox.baseVal.height,
          }),
        },
        preventDefault: () => event.preventDefault(),
      });
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, [onWheel, board]);
  const layout = board?.getLayout({ hexSize });
  const transform = viewport.getTransform();
  const hitSizes = useMemo(() => {
    const selectable = layout
      ? [...layout.getEdges(), ...layout.getVertices()].filter((target) =>
          target.getIsSelectable(),
        )
      : [];
    const pixels = screenScale * transform.scale;
    return new Map(
      selectable.map((target) => {
        const nearest = Math.min(
          ...selectable
            .filter((other) => other !== target)
            .map(
              (other) =>
                Math.hypot(
                  other.center.x - target.center.x,
                  other.center.y - target.center.y,
                ) * pixels,
            ),
        );
        return [target, Math.max(24, Math.min(44, nearest - 4)) / pixels];
      }),
    );
  }, [layout, screenScale, transform.scale]);
  if (!board || !layout) return null;
  const box = layout.viewBox;
  function hitSize(target: Edge | Vertex) {
    return hitSizes.get(target) ?? 24 / (screenScale * transform.scale);
  }
  function dropTarget(kind: "space" | "edge" | "vertex", id: string) {
    const matches = dropTargets.filter(
      (target) =>
        matchesTarget(target, kind, boardId, id) &&
        (!dropRoute ||
          (target.interactionKey === dropRoute.interactionKey &&
            target.cardInputKey === dropRoute.cardInputKey &&
            target.inputKey === dropRoute.inputKey)),
    );
    // An ambiguous visual destination must be bound to an explicit route.
    return matches.length === 1 ? matches[0] : null;
  }
  function control(target: Space | Edge | Vertex, label: string) {
    // SVG groups do not accept the native button type.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Strip the native button type before spreading props on an SVG group.
    const { disabled, type: _type, onClick, ...data } = target.getTargetProps();
    return {
      ...data,
      role: "button",
      style: {
        pointerEvents: disabled ? ("none" as const) : ("auto" as const),
      },
      tabIndex: disabled ? -1 : 0,
      "aria-disabled": disabled,
      "aria-pressed": target.getIsSelected(),
      "aria-label": targetLabel?.(target) ?? label,
      onClick: () => {
        if (!disabled) onClick();
      },
      onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => {
        if (!disabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      },
      onPointerDown: (event: React.PointerEvent<SVGGElement>) => {
        if (!disabled) event.stopPropagation();
      },
    };
  }
  return (
    <svg
      ref={surface}
      style={pointer.style}
      onPointerDown={(event) => pointer.onPointerDown(pointerEvent(event))}
      onPointerMove={(event) => pointer.onPointerMove(pointerEvent(event))}
      onPointerUp={(event) => pointer.onPointerUp(pointerEvent(event))}
      onPointerCancel={pointer.onPointerCancel}
      onLostPointerCapture={pointer.onLostPointerCapture}
      className={`db-grid ${className}`}
      role="group"
      aria-label={label}
      viewBox={`${box.x - 15} ${box.y - 15} ${box.width + 30} ${box.height + 30}`}
    >
      <g
        transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}
      >
        {(renderTile || tileProps) &&
          layout.getTiles().map((tile) => (
            <g key={tile.ref} data-tile-ref={tile.ref} pointerEvents="none">
              {tileProps && (
                <path
                  d={tile.outlines
                    .map(
                      (loop) =>
                        loop
                          .map(
                            (point, index) =>
                              `${index === 0 ? "M" : "L"}${point.x},${point.y}`,
                          )
                          .join(" ") + " Z",
                    )
                    .join(" ")}
                  fillRule="evenodd"
                  {...tileProps(tile)}
                />
              )}
              {renderTile?.(tile)}
            </g>
          ))}
        {layout.getSpaces().map((space, index) => (
          <DropControl
            key={space.id}
            dropTarget={dropTarget("space", space.id)}
            {...control(space, space.data.name ?? `Space ${index + 1}`)}
          >
            <polygon
              className="db-grid-cell"
              points={space
                .points()
                .map((point) => `${point.x},${point.y}`)
                .join(" ")}
              {...spaceProps?.(space)}
            />
            {renderSpace?.(space)}
          </DropControl>
        ))}
        {layout.getEdges().map((edge, index) => (
          <DropControl
            key={edge.id}
            dropTarget={dropTarget("edge", edge.id)}
            {...control(edge, `Edge ${index + 1}`)}
            data-target-kind="edge"
          >
            {edge.getIsSelectable() && (
              <EdgeHitArea edge={edge} size={hitSize(edge)} />
            )}
            <line
              x1={edge.line[0].x}
              y1={edge.line[0].y}
              x2={edge.line[1].x}
              y2={edge.line[1].y}
              stroke="var(--muted-foreground)"
              strokeWidth={8}
              {...edgeProps?.(edge)}
            />
            {renderEdge?.(edge)}
          </DropControl>
        ))}
        {layout.getVertices().map((vertex, index) => (
          <DropControl
            key={vertex.id}
            dropTarget={dropTarget("vertex", vertex.id)}
            {...control(vertex, `Vertex ${index + 1}`)}
            data-target-kind="vertex"
          >
            {vertex.getIsSelectable() && (
              <circle
                data-hit-area="vertex"
                cx={vertex.center.x}
                cy={vertex.center.y}
                r={hitSize(vertex) / 2}
                fill="transparent"
              />
            )}
            <circle
              cx={vertex.center.x}
              cy={vertex.center.y}
              r={9}
              fill="var(--muted)"
              {...vertexProps?.(vertex)}
            />
            {renderVertex?.(vertex)}
          </DropControl>
        ))}
      </g>
    </svg>
  );
}

function EdgeHitArea({ edge, size }: { edge: Edge; size: number }) {
  const [start, end] = edge.line;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  // A filled capsule retains real bounds even for horizontal or vertical edges.
  return (
    <rect
      data-hit-area="edge"
      x={-size / 2}
      y={-size / 2}
      width={Math.hypot(dx, dy) + size}
      height={size}
      rx={size / 2}
      transform={`translate(${start.x} ${start.y}) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI})`}
      fill="transparent"
    />
  );
}

/** The browser hit-tests the rendered shapes under every transform. */
function DropControl({
  dropTarget,
  children,
  style,
  ...props
}: ComponentProps<"g"> & { dropTarget: DropTarget | null }) {
  const drop = useDropArea(dropTarget);
  return (
    <g
      {...props}
      {...drop.props}
      // A destination stays hittable while a card is dragged over it.
      style={dropTarget ? { ...style, pointerEvents: "auto" } : style}
    >
      {children}
    </g>
  );
}

function matchesTarget(
  target: RuntimeBoardTarget,
  kind: "space" | "edge" | "vertex",
  boardId: string,
  id: string,
) {
  return (
    target.kind === kind &&
    (target.valueKind === "board-space"
      ? target.value.boardId === boardId && target.value.spaceId === id
      : target.boardId === boardId && target.value === id)
  );
}
