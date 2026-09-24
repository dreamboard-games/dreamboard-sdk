import { useGame } from "@game";
import { useEffect, useRef, type ReactNode, type ComponentProps } from "react";
import "./tokens.css";
type Model = Parameters<Parameters<typeof useGame>[0]>[0];
type Board = NonNullable<ReturnType<Model["boards"]["get"]>>;
type Layout = ReturnType<Board["getLayout"]>;
type Space = ReturnType<Layout["getSpaces"]>[number];
type Edge = ReturnType<Layout["getEdges"]>[number];
type Vertex = ReturnType<Layout["getVertices"]>[number];
export interface BoardTargetsProps {
  boardId: Parameters<Model["boards"]["get"]>[0];
  hexSize?: number;
  label?: string;
  className?: string;
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
  label = "Board",
  className = "",
  renderSpace,
  renderEdge,
  renderVertex,
  spaceProps,
  edgeProps,
  vertexProps,
}: BoardTargetsProps) {
  const board = useGame((game) => game.boards.get(boardId));
  const viewport = useGame((game) => game.viewport);
  const surface = useRef<SVGSVGElement>(null);
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
  if (!board) return null;
  const layout = board.getLayout({ hexSize });
  const box = layout.viewBox;
  const transform = viewport.getTransform();
  function control(target: Space | Edge | Vertex) {
    const { disabled, type: _type, onClick, ...data } = target.getTargetProps();
    return {
      ...data,
      role: "button",
      tabIndex: disabled ? -1 : 0,
      "aria-disabled": disabled,
      "aria-pressed": target.getIsSelected(),
      "aria-label": target.id,
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
        {layout.getSpaces().map((space) => (
          <g key={space.id} {...control(space)}>
            <polygon
              className="db-grid-cell"
              points={space
                .points()
                .map((point) => `${point.x},${point.y}`)
                .join(" ")}
              {...spaceProps?.(space)}
            />
            {renderSpace?.(space)}
          </g>
        ))}
        {layout.getEdges().map((edge) => (
          <g key={edge.id} {...control(edge)}>
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
          </g>
        ))}
        {layout.getVertices().map((vertex) => (
          <g key={vertex.id} {...control(vertex)}>
            <circle
              cx={vertex.center.x}
              cy={vertex.center.y}
              r={9}
              fill="var(--muted)"
              {...vertexProps?.(vertex)}
            />
            {renderVertex?.(vertex)}
          </g>
        ))}
      </g>
    </svg>
  );
}
