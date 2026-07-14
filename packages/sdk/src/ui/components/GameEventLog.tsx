import { Activity, ChevronDown } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useId } from "react";
import type { ProjectedGameEvent, SystemActionEvent } from "../../runtime.js";
import { useTheme } from "../theme/ThemeProvider.js";
import { surfaceStyle } from "../theme/derive.js";
import type { Theme } from "../theme/tokens.js";

export type { ProjectedGameEvent, SystemActionEvent };

export interface SystemActionSummaryProps {
  event: SystemActionEvent;
  className?: string;
  style?: CSSProperties;
}

export interface GameEventLogProps {
  events: readonly ProjectedGameEvent[];
  empty?: ReactNode;
  maxVisible?: number;
  className?: string;
  style?: CSSProperties;
}

function formatDetailValue(value: string | number | boolean) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function eventKey(event: ProjectedGameEvent) {
  return `${event.version}:${event.index}`;
}

export function SystemActionSummary({
  event,
  className,
  style,
}: SystemActionSummaryProps) {
  const theme = useTheme();
  const titleId = useId();
  const summaryId = useId();
  return (
    <article
      className={className}
      aria-labelledby={titleId}
      aria-describedby={event.summary ? summaryId : undefined}
      style={{
        ...eventItemStyle(theme),
        ...style,
      }}
    >
      <Activity
        aria-hidden="true"
        size={18}
        strokeWidth={2.5}
        style={{
          color: theme.semantic.intent.info.solid,
          flex: "0 0 auto",
          marginTop: 2,
        }}
      />
      <div style={{ display: "grid", gap: theme.space[2], minWidth: 0 }}>
        <div style={{ display: "grid", gap: theme.space[1] }}>
          <h3 id={titleId} style={eventTitleStyle(theme)}>
            {event.title}
          </h3>
          {event.summary ? (
            <p id={summaryId} style={eventBodyStyle(theme)}>
              {event.summary}
            </p>
          ) : null}
        </div>
        {event.details && event.details.length > 0 ? (
          <dl style={detailGridStyle(theme)}>
            {event.details.map((detail, index) => (
              <div
                key={`${detail.label}:${index}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: theme.space[3],
                  minWidth: 0,
                }}
              >
                <dt style={detailLabelStyle(theme)}>{detail.label}</dt>
                <dd style={detailValueStyle(theme)}>
                  {formatDetailValue(detail.value)}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </article>
  );
}

export function GameEventLog({
  events,
  empty = "No automated actions yet.",
  maxVisible,
  className,
  style,
}: GameEventLogProps) {
  const theme = useTheme();
  const titleId = useId();
  const visibleEvents =
    maxVisible === undefined ? events : events.slice(0, maxVisible);
  const hiddenCount = Math.max(0, events.length - visibleEvents.length);

  return (
    <section
      className={className}
      aria-labelledby={titleId}
      style={{
        ...logContainerStyle(theme),
        ...style,
      }}
    >
      <header style={logHeaderStyle(theme)}>
        <h2 id={titleId} style={logTitleStyle(theme)}>
          Automated actions
        </h2>
        <span style={logCountStyle(theme)}>{events.length}</span>
      </header>
      {visibleEvents.length === 0 ? (
        <p style={emptyStyle(theme)}>{empty}</p>
      ) : (
        <ol
          aria-live="polite"
          style={{
            display: "grid",
            gap: theme.space[2],
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {visibleEvents.map((event) => (
            <li key={eventKey(event)}>
              <SystemActionSummary event={event} />
            </li>
          ))}
        </ol>
      )}
      {hiddenCount > 0 ? (
        <div style={moreStyle(theme)}>
          <ChevronDown aria-hidden="true" size={16} />
          <span>{hiddenCount} earlier actions hidden</span>
        </div>
      ) : null}
    </section>
  );
}

function logContainerStyle(theme: Theme): CSSProperties {
  return {
    ...surfaceStyle(theme, { tone: "card" }),
    display: "grid",
    gap: theme.space[3],
    padding: theme.space[4],
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.semantic.border.subtle}`,
    minWidth: 0,
  };
}

function logHeaderStyle(theme: Theme): CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.space[3],
    minWidth: 0,
  };
}

function logTitleStyle(theme: Theme): CSSProperties {
  return {
    margin: 0,
    color: theme.semantic.text.primary,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  };
}

function logCountStyle(theme: Theme): CSSProperties {
  return {
    minWidth: 28,
    height: 28,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.pill,
    background: theme.semantic.intent.info.soft,
    color: theme.semantic.intent.info.onSoft,
    fontFamily: theme.typography.fontFamily.tabular,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  };
}

function eventItemStyle(theme: Theme): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "20px minmax(0, 1fr)",
    gap: theme.space[3],
    padding: theme.space[3],
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.semantic.intent.info.border}`,
    background: theme.semantic.intent.info.soft,
    minWidth: 0,
  };
}

function eventTitleStyle(theme: Theme): CSSProperties {
  return {
    margin: 0,
    color: theme.semantic.text.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  };
}

function eventBodyStyle(theme: Theme): CSSProperties {
  return {
    margin: 0,
    color: theme.semantic.text.muted,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.normal,
  };
}

function detailGridStyle(theme: Theme): CSSProperties {
  return {
    display: "grid",
    gap: theme.space[1],
    margin: 0,
    paddingTop: theme.space[2],
    borderTop: `1px solid ${theme.semantic.intent.info.border}`,
  };
}

function detailLabelStyle(theme: Theme): CSSProperties {
  return {
    color: theme.semantic.text.muted,
    fontSize: theme.typography.fontSize.xs,
    minWidth: 0,
  };
}

function detailValueStyle(theme: Theme): CSSProperties {
  return {
    margin: 0,
    color: theme.semantic.text.primary,
    fontFamily: theme.typography.fontFamily.tabular,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    textAlign: "right",
    minWidth: 0,
  };
}

function emptyStyle(theme: Theme): CSSProperties {
  return {
    margin: 0,
    color: theme.semantic.text.muted,
    fontSize: theme.typography.fontSize.sm,
  };
}

function moreStyle(theme: Theme): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.space[1],
    color: theme.semantic.text.muted,
    fontSize: theme.typography.fontSize.xs,
  };
}
