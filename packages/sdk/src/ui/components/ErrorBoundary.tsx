/**
 * ErrorBoundary component
 *
 * Catches React errors and displays a fallback UI.
 *
 * Visuals are sourced from the public `--db-*` theme variables so that
 * mounting under {@link ThemeProvider} reskins the fallback automatically.
 * Fallback values match the calm `tabletop` preset, so the surface still
 * reads correctly when the boundary catches an error before any provider
 * could mount (a common case during startup).
 */

import {
  Component,
  type CSSProperties,
  type ReactNode,
  type ErrorInfo,
} from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cssVarOr } from "../theme/css-vars.js";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Stable, theme-driven default tokens for the fallback UI.
 *
 * Each value resolves through `--db-*` theme variables when a
 * {@link ThemeProvider} ancestor is present, and falls back to the
 * tabletop preset's calm baseline when the boundary renders standalone.
 */
const FALLBACK_TOKENS = {
  appSurface: cssVarOr("#fdfbf7", "semantic", "surface", "app"),
  panelSurface: cssVarOr("#ffffff", "semantic", "surface", "card"),
  insetSurface: cssVarOr("#f8fafc", "semantic", "surface", "inset"),
  textPrimary: cssVarOr("#1f2937", "semantic", "text", "primary"),
  textMuted: cssVarOr("#475569", "semantic", "text", "muted"),
  textDisabled: cssVarOr("#94a3b8", "semantic", "text", "disabled"),
  borderSubtle: cssVarOr("#e2e8f0", "semantic", "border", "subtle"),
  borderDefault: cssVarOr("#cbd5e1", "semantic", "border", "default"),
  dangerSoft: cssVarOr("#fee2e2", "semantic", "intent", "danger", "soft"),
  dangerBorder: cssVarOr("#991b1b", "semantic", "intent", "danger", "border"),
  dangerOnSoft: cssVarOr("#991b1b", "semantic", "intent", "danger", "onSoft"),
  primarySolid: cssVarOr("#0f172a", "semantic", "intent", "primary", "solid"),
  primaryOn: cssVarOr("#ffffff", "semantic", "intent", "primary", "on"),
  primaryBorder: cssVarOr("#0f172a", "semantic", "intent", "primary", "border"),
  fontBody: cssVarOr(
    "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    "typography",
    "fontFamily",
    "body",
  ),
  fontDisplay: cssVarOr(
    "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    "typography",
    "fontFamily",
    "display",
  ),
  fontMono: cssVarOr(
    "ui-monospace, SFMono-Regular, monospace",
    "typography",
    "fontFamily",
    "mono",
  ),
  radiusMd: cssVarOr("8px", "radius", "md"),
  radiusLg: cssVarOr("12px", "radius", "lg"),
  radiusPill: cssVarOr("999px", "radius", "pill"),
  elevationRest: cssVarOr(
    "0 4px 12px rgba(15, 23, 42, 0.08)",
    "elevation",
    "rest",
  ),
} as const;

export function DefaultErrorFallback({
  error,
  onReset,
}: {
  error: Error;
  onReset: () => void;
}) {
  const t = FALLBACK_TOKENS;
  const styles = {
    shell: {
      alignItems: "center",
      background: t.appSurface,
      boxSizing: "border-box",
      color: t.textPrimary,
      display: "flex",
      fontFamily: t.fontBody,
      justifyContent: "center",
      minHeight: "100vh",
      padding: "24px",
    },
    panel: {
      background: t.panelSurface,
      border: `1px solid ${t.borderSubtle}`,
      borderRadius: t.radiusLg,
      boxShadow: t.elevationRest,
      boxSizing: "border-box",
      maxWidth: "520px",
      padding: "28px",
      width: "100%",
    },
    iconWrap: {
      alignItems: "center",
      background: t.dangerSoft,
      border: `1px solid ${t.dangerBorder}`,
      borderRadius: t.radiusPill,
      display: "flex",
      height: "56px",
      justifyContent: "center",
      marginBottom: "18px",
      width: "56px",
    },
    eyebrow: {
      color: t.dangerOnSoft,
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.08em",
      margin: "0 0 8px",
      textTransform: "uppercase",
    },
    title: {
      color: t.textPrimary,
      fontFamily: t.fontDisplay,
      fontSize: "28px",
      fontWeight: 800,
      lineHeight: 1.1,
      margin: "0 0 12px",
    },
    body: {
      color: t.textMuted,
      fontSize: "15px",
      lineHeight: 1.5,
      margin: "0 0 20px",
    },
    details: {
      marginBottom: "22px",
    },
    summary: {
      color: t.textPrimary,
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: 600,
      marginBottom: "8px",
    },
    pre: {
      background: t.insetSurface,
      border: `1px solid ${t.borderDefault}`,
      borderRadius: t.radiusMd,
      color: t.textMuted,
      fontFamily: t.fontMono,
      fontSize: "12px",
      lineHeight: 1.45,
      margin: 0,
      maxHeight: "180px",
      overflow: "auto",
      padding: "12px",
      whiteSpace: "pre-wrap",
    },
    button: {
      alignItems: "center",
      background: t.primarySolid,
      border: `1px solid ${t.primaryBorder}`,
      borderRadius: t.radiusMd,
      color: t.primaryOn,
      cursor: "pointer",
      display: "inline-flex",
      fontFamily: t.fontBody,
      fontSize: "15px",
      fontWeight: 700,
      gap: "8px",
      justifyContent: "center",
      padding: "12px 16px",
      width: "100%",
    },
  } satisfies Record<string, CSSProperties>;

  return (
    <div
      data-dreamboard-error-fallback=""
      style={styles.shell}
      role="alert"
      aria-live="assertive"
    >
      <div style={styles.panel}>
        <div style={styles.iconWrap}>
          <AlertTriangle
            size={28}
            color={t.dangerBorder}
            strokeWidth={2.25}
            aria-hidden="true"
          />
        </div>

        <p style={styles.eyebrow}>Runtime error</p>

        <h1 style={styles.title}>Game failed to start</h1>

        <p style={styles.body}>
          The game encountered an error and couldn&apos;t continue. You can try
          reloading to start fresh.
        </p>

        <details style={styles.details}>
          <summary style={styles.summary}>Technical details</summary>
          <pre style={styles.pre}>
            {error.message}
            {error.stack && (
              <>
                {"\n\n"}
                {error.stack}
              </>
            )}
          </pre>
        </details>

        <button type="button" onClick={onReset} style={styles.button}>
          <RefreshCw size={18} aria-hidden="true" />
          Try again
        </button>
      </div>
    </div>
  );
}
