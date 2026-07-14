import { clsx } from "clsx";
import { type HTMLAttributes, type ReactNode } from "react";
import { useTheme } from "../theme/ThemeProvider.js";
import { surfaceStyle } from "../theme/derive.js";

export type PanelTone = "card" | "hud" | "inset";

export interface PanelRootProps extends HTMLAttributes<HTMLDivElement> {
  tone?: PanelTone;
  children: ReactNode;
}

export interface PanelPartProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export interface PanelTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children?: ReactNode;
}

export interface PanelDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
}

export function PanelRoot({
  tone = "card",
  className,
  children,
  style,
  ...props
}: PanelRootProps) {
  const theme = useTheme();
  return (
    <section
      data-dreamboard-panel=""
      data-tone={tone}
      className={className}
      style={{
        ...surfaceStyle(theme, { tone, radius: "hud" }),
        boxShadow: theme.elevation.rest,
        overflow: "hidden",
        fontFamily: theme.typography.fontFamily.body,
        ...style,
      }}
      {...props}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  className,
  style,
  children,
  ...props
}: PanelPartProps) {
  const theme = useTheme();
  return (
    <div
      data-dreamboard-panel-header=""
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.space[1],
        padding: `${theme.space[3]} ${theme.space[4]}`,
        borderBottom: `1px solid ${theme.semantic.border.subtle}`,
        background: theme.semantic.surface.hud,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function PanelTitle({
  className,
  style,
  children,
  ...props
}: PanelTitleProps) {
  const theme = useTheme();
  return (
    <h2
      data-dreamboard-panel-title=""
      className={className}
      style={{
        margin: 0,
        fontFamily: theme.typography.fontFamily.display,
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
        lineHeight: theme.typography.lineHeight.tight,
        color: theme.semantic.text.primary,
        ...style,
      }}
      {...props}
    >
      {children}
    </h2>
  );
}

export function PanelDescription({
  className,
  style,
  children,
  ...props
}: PanelDescriptionProps) {
  const theme = useTheme();
  return (
    <p
      data-dreamboard-panel-description=""
      className={className}
      style={{
        margin: 0,
        color: theme.semantic.text.muted,
        fontSize: theme.typography.fontSize.sm,
        lineHeight: theme.typography.lineHeight.normal,
        ...style,
      }}
      {...props}
    >
      {children}
    </p>
  );
}

export function PanelBody({
  className,
  style,
  children,
  ...props
}: PanelPartProps) {
  const theme = useTheme();
  return (
    <div
      data-dreamboard-panel-body=""
      className={clsx("min-w-0", className)}
      style={{
        padding: theme.space[4],
        display: "flex",
        flexDirection: "column",
        gap: theme.space[4],
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function PanelActions({
  className,
  style,
  children,
  ...props
}: PanelPartProps) {
  const theme = useTheme();
  return (
    <div
      data-dreamboard-panel-actions=""
      className={className}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: theme.space[2],
        padding: `${theme.space[3]} ${theme.space[4]}`,
        borderTop: `1px solid ${theme.semantic.border.subtle}`,
        background: theme.semantic.surface.inset,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export const Panel = {
  Root: PanelRoot,
  Header: PanelHeader,
  Title: PanelTitle,
  Description: PanelDescription,
  Body: PanelBody,
  Actions: PanelActions,
};
