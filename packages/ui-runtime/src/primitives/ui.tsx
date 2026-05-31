import type { CSSProperties, ReactNode } from "react";
import {
  ThemeProvider,
  type Theme,
  type ThemeOverride,
  type ThemePresetId,
} from "@dreamboard-games/ui-sdk";

export interface UIRootProps {
  /**
   * Preset id, a full Theme, or omitted to defer to the host-mounted theme.
   * When omitted, no provider is mounted and existing parent themes apply.
   */
  theme?: ThemePresetId | Theme;
  /** Deep-partial overrides forwarded to the SDK ThemeProvider. */
  themeOverride?: ThemeOverride;
  /** Forwarded to the SDK ThemeProvider. */
  reducedMotion?: "auto" | "force" | "ignore";
  /** Forwarded to the SDK ThemeProvider wrapper. */
  className?: string;
  /** Forwarded to the SDK ThemeProvider wrapper style. */
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Root provider for generated UI contracts.
 *
 * Composes the SDK `ThemeProvider` so authors can write
 * `<UI.Root theme="tabletop">` and have presentation tokens applied without
 * importing `@dreamboard-games/ui-sdk` themselves. The runtime workspace contract
 * stacks plugin-state, toast and mobile-hand providers around this.
 */
export function UIRoot({
  theme,
  themeOverride,
  reducedMotion,
  className,
  style,
  children,
}: UIRootProps) {
  if (theme === undefined && themeOverride === undefined) {
    return <>{children}</>;
  }
  return (
    <ThemeProvider
      theme={theme}
      override={themeOverride}
      reducedMotion={reducedMotion}
      className={className}
      style={style}
    >
      {children}
    </ThemeProvider>
  );
}

export const UI = {
  Root: UIRoot,
};
