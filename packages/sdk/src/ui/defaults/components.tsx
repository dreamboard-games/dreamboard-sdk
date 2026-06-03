import type { CSSProperties, HTMLAttributes } from "react";
import {
  renderPrimitive,
  type PrimitiveCommonProps,
} from "../primitives/primitive-props.js";

type LayoutPrimitiveProps = PrimitiveCommonProps & HTMLAttributes<HTMLElement>;

function layoutStyle(
  base: CSSProperties,
  style: CSSProperties | undefined,
): CSSProperties {
  return style ? { ...base, ...style } : base;
}

export function GameLayoutRoot({
  children,
  style,
  ...props
}: LayoutPrimitiveProps) {
  return renderPrimitive("div", {
    ...props,
    "data-dreamboard-game-layout": "",
    style: layoutStyle(
      {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(18rem, 24rem)",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        gridTemplateAreas: `"header header" "board sidebar" "bottom sidebar"`,
        minHeight: "100%",
        gap: "1rem",
      },
      style,
    ),
    children,
  });
}

export function GameLayoutHeader({
  children,
  style,
  ...props
}: LayoutPrimitiveProps) {
  return renderPrimitive("header", {
    ...props,
    "data-dreamboard-game-layout-header": "",
    style: layoutStyle({ gridArea: "header" }, style),
    children,
  });
}

export function GameLayoutBoard({
  children,
  style,
  ...props
}: LayoutPrimitiveProps) {
  return renderPrimitive("section", {
    ...props,
    "data-dreamboard-game-layout-board": "",
    style: layoutStyle({ gridArea: "board", minWidth: 0 }, style),
    children,
  });
}

export function GameLayoutSidebar({
  children,
  style,
  ...props
}: LayoutPrimitiveProps) {
  return renderPrimitive("aside", {
    ...props,
    "data-dreamboard-game-layout-sidebar": "",
    style: layoutStyle(
      {
        gridArea: "sidebar",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      },
      style,
    ),
    children,
  });
}

export function GameLayoutBottom({
  children,
  style,
  ...props
}: LayoutPrimitiveProps) {
  return renderPrimitive("section", {
    ...props,
    "data-dreamboard-game-layout-bottom": "",
    style: layoutStyle({ gridArea: "bottom", minWidth: 0 }, style),
    children,
  });
}

export const GameLayout = {
  Root: GameLayoutRoot,
  Header: GameLayoutHeader,
  Board: GameLayoutBoard,
  Sidebar: GameLayoutSidebar,
  Bottom: GameLayoutBottom,
};
