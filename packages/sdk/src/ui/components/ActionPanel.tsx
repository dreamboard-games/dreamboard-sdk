/**
 * Collapsible panel for grouping game actions with state-based visibility.
 *
 * Visual styling is sourced entirely from the active {@link useTheme}.
 * The previous bespoke "wobbly notebook" treatment (`wobbly-border-lg` /
 * `hard-shadow-lg` / hardcoded `#fff9c4` / `#fdfbf7`) has been retired
 * in favour of `surfaceStyle` + `chipStyle` so the panel re-skins
 * uniformly when authors swap themes.
 */

import { useId, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { Panel } from "./Panel.js";
import { useTheme } from "../theme/ThemeProvider.js";
import {
  chipStyle,
  intentForVariant,
  type ButtonVariant,
} from "../theme/derive.js";

export interface ActionPanelProps {
  title?: string;
  /** Current game state/phase for context display */
  state?: string;
  /** Human-readable state labels */
  stateLabels?: Record<string, string>;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  children: ReactNode;
  className?: string;
}

export function ActionPanel({
  title = "Actions",
  state,
  stateLabels,
  collapsible = true,
  defaultExpanded = true,
  children,
  className,
}: ActionPanelProps) {
  const theme = useTheme();
  const reducedMotion = theme.motion.reducedMotion === "true";
  const contentId = useId();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isHovered, setIsHovered] = useState(false);

  const stateLabel = state
    ? stateLabels?.[state] || state.replace(/([A-Z])/g, " $1").trim()
    : undefined;

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      className={className}
    >
      <Panel.Root
        data-dreamboard-action-panel=""
        data-state={isExpanded ? "open" : "closed"}
        data-collapsible={collapsible ? "true" : undefined}
        role="region"
        aria-label={title}
      >
        <button
          type="button"
          onClick={() => collapsible && setIsExpanded(!isExpanded)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          disabled={!collapsible}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          style={{
            width: "100%",
            display: "block",
            background:
              collapsible && isHovered
                ? theme.semantic.surface.inset
                : "transparent",
            color: theme.semantic.text.primary,
            cursor: collapsible ? "pointer" : "default",
            transition: `background ${theme.motion.duration.fast} ${theme.motion.easing.out}`,
            border: "none",
            textAlign: "left",
            appearance: "none",
            padding: 0,
          }}
        >
          <Panel.Header
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between",
              gap: theme.space[3],
              borderBottom: isExpanded
                ? `1px dashed ${theme.semantic.border.subtle}`
                : "1px solid transparent",
              background: "transparent",
            }}
          >
            <div>
              <Panel.Title style={{ fontSize: theme.typography.fontSize.xl }}>
                {title}
              </Panel.Title>
              {stateLabel && (
                <Panel.Description
                  style={{
                    marginTop: theme.space[1],
                    fontWeight: theme.typography.fontWeight.medium,
                    display: "flex",
                    alignItems: "center",
                    gap: theme.space[2],
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: theme.radius.pill,
                      background: theme.semantic.intent.primary.solid,
                      border: `1px solid ${theme.semantic.intent.primary.border}`,
                      display: "inline-block",
                    }}
                  />
                  Phase: {stateLabel}
                </Panel.Description>
              )}
            </div>
            {collapsible && (
              <motion.span
                animate={
                  reducedMotion ? undefined : { rotate: isExpanded ? 0 : 180 }
                }
                transition={{ duration: 0.2 }}
                style={{
                  padding: theme.space[1],
                  borderRadius: theme.radius.md,
                  border: `1px solid ${theme.semantic.border.default}`,
                  background: theme.semantic.surface.card,
                  color: theme.semantic.text.primary,
                  display: "inline-flex",
                }}
              >
                <ChevronUp
                  size={20}
                  strokeWidth={2.5}
                  aria-hidden="true"
                  style={{ display: "block" }}
                />
              </motion.span>
            )}
          </Panel.Header>
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              id={contentId}
              initial={
                reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }
              }
              animate={
                reducedMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }
              }
              exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{
                overflow: "hidden",
                background: theme.semantic.surface.card,
              }}
            >
              <Panel.Body style={{ gap: theme.space[6] }}>
                {children}
              </Panel.Body>
            </motion.div>
          )}
        </AnimatePresence>
      </Panel.Root>
    </motion.div>
  );
}

export interface ActionGroupProps {
  title: string;
  description?: string;
  visible?: boolean;
  /** Highlight style for special phases. Maps directly onto theme intent slots. */
  variant?: "default" | "warning" | "danger" | "success";
  children: ReactNode;
  className?: string;
}

const VARIANT_TO_INTENT: Record<
  ActionGroupProps["variant"] & string,
  ButtonVariant | null
> = {
  default: null,
  warning: "warning",
  danger: "danger",
  success: "success",
};

export function ActionGroup({
  title,
  description,
  visible = true,
  variant = "default",
  children,
  className,
}: ActionGroupProps) {
  const theme = useTheme();
  const reducedMotion = theme.motion.reducedMotion === "true";

  if (!visible) return null;

  const intentVariant = VARIANT_TO_INTENT[variant];
  const intent = intentVariant ? intentForVariant(theme, intentVariant) : null;

  const containerStyle: React.CSSProperties = intent
    ? {
        background: intent.soft,
        color: intent.onSoft,
        border: `1px solid ${intent.border}`,
        borderRadius: theme.radius.lg,
        boxShadow: theme.elevation.rest,
      }
    : {
        background: theme.semantic.surface.card,
        color: theme.semantic.text.primary,
        border: `1px solid ${theme.semantic.border.subtle}`,
        borderRadius: theme.radius.lg,
        boxShadow: theme.elevation.rest,
      };

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -10 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
      className={className}
      data-dreamboard-action-group=""
      data-variant={variant}
      style={{
        position: "relative",
        padding: theme.space[4],
        fontFamily: theme.typography.fontFamily.body,
        ...containerStyle,
      }}
      role="group"
      aria-labelledby={`action-group-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <span
        style={{
          position: "absolute",
          top: -10,
          left: theme.space[3],
          ...chipStyle(theme, { variant: "secondary", size: "sm" }),
          background: theme.semantic.surface.card,
        }}
      >
        Group
      </span>
      <h3
        id={`action-group-${title.toLowerCase().replace(/\s+/g, "-")}`}
        style={{
          margin: 0,
          fontFamily: theme.typography.fontFamily.display,
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.bold,
          color: intent?.onSoft ?? theme.semantic.text.primary,
          marginBottom: description ? theme.space[2] : theme.space[3],
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            margin: 0,
            marginBottom: theme.space[4],
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: intent?.onSoft ?? theme.semantic.text.muted,
            opacity: 0.85,
          }}
        >
          {description}
        </p>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.space[3],
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}
