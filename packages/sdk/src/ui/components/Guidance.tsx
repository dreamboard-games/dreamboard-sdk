import {
  AlertCircle,
  CheckCircle2,
  Circle,
  HelpCircle,
  Info,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useId } from "react";
import { useTheme } from "../theme/ThemeProvider.js";
import { chipStyle } from "../theme/derive.js";
import type { Theme } from "../theme/tokens.js";

export interface GuidancePhase {
  id: string;
  label: string;
  summary?: ReactNode;
  objective?: ReactNode;
}

export interface GuidanceSetupStep {
  id: string;
  label: ReactNode;
  description?: ReactNode;
}

export interface SetupGuidance {
  profileId: string;
  name: ReactNode;
  summary?: ReactNode;
  steps: readonly GuidanceSetupStep[];
}

export interface GuidanceAction {
  label: ReactNode;
  help?: ReactNode;
  unavailableReason?: ReactNode;
}

export interface GuidancePanelProps {
  phase: GuidancePhase;
  actions?: readonly GuidanceAction[];
  className?: string;
  style?: CSSProperties;
}

export interface SetupChecklistProps {
  guidance?: SetupGuidance | null;
  completedStepIds?: readonly string[];
  className?: string;
  style?: CSSProperties;
}

export interface ActionHelpProps {
  label: ReactNode;
  help?: ReactNode;
  unavailableReason?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function GuidancePanel({
  phase,
  actions = [],
  className,
  style,
}: GuidancePanelProps) {
  const theme = useTheme();
  const titleId = useId();
  const summaryId = useId();
  const hasSummary = phase.summary !== undefined && phase.summary !== null;
  const hasObjective =
    phase.objective !== undefined && phase.objective !== null;
  const describedBy = [
    hasSummary || hasObjective ? summaryId : undefined,
  ].filter(Boolean);

  return (
    <section
      className={className}
      aria-labelledby={titleId}
      aria-describedby={describedBy.join(" ") || undefined}
      style={{
        ...guidanceContainerStyle(theme),
        ...style,
      }}
    >
      <header style={headerStyle(theme)}>
        <Info
          size={20}
          strokeWidth={2.5}
          aria-hidden="true"
          style={{ color: theme.semantic.intent.info.solid, flex: "0 0 auto" }}
        />
        <div style={{ minWidth: 0 }}>
          <h2 id={titleId} style={titleStyle(theme)}>
            {phase.label}
          </h2>
          <div id={summaryId} style={bodyStackStyle(theme)}>
            {hasSummary ? (
              <p style={bodyTextStyle(theme)}>{phase.summary}</p>
            ) : null}
            {hasObjective ? (
              <p style={objectiveTextStyle(theme)}>{phase.objective}</p>
            ) : null}
          </div>
        </div>
      </header>
      {actions.length > 0 ? (
        <div
          aria-label="Available action guidance"
          style={{
            display: "grid",
            gap: theme.space[2],
          }}
        >
          {actions.map((action, index) => (
            <ActionHelp
              key={`${String(action.label)}:${index}`}
              label={action.label}
              help={action.help}
              unavailableReason={action.unavailableReason}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function SetupChecklist({
  guidance,
  completedStepIds = [],
  className,
  style,
}: SetupChecklistProps) {
  const theme = useTheme();
  const titleId = useId();
  const completed = new Set(completedStepIds);
  if (!guidance) return null;

  return (
    <section
      className={className}
      aria-labelledby={titleId}
      style={{
        ...guidanceContainerStyle(theme),
        ...style,
      }}
    >
      <header style={headerStyle(theme)}>
        <CheckCircle2
          size={20}
          strokeWidth={2.5}
          aria-hidden="true"
          style={{
            color: theme.semantic.intent.success.solid,
            flex: "0 0 auto",
          }}
        />
        <div style={{ minWidth: 0 }}>
          <h2 id={titleId} style={titleStyle(theme)}>
            {guidance.name}
          </h2>
          {guidance.summary ? (
            <p style={bodyTextStyle(theme)}>{guidance.summary}</p>
          ) : null}
        </div>
      </header>
      {guidance.steps.length > 0 ? (
        <ol
          style={{
            display: "grid",
            gap: theme.space[2],
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {guidance.steps.map((step) => {
            const isComplete = completed.has(step.id);
            return (
              <li
                key={step.id}
                aria-current={isComplete ? undefined : "step"}
                style={{
                  display: "grid",
                  gridTemplateColumns: "24px minmax(0, 1fr)",
                  gap: theme.space[3],
                  alignItems: "start",
                  minWidth: 0,
                }}
              >
                {isComplete ? (
                  <CheckCircle2
                    size={20}
                    strokeWidth={2.5}
                    aria-label="Complete"
                    style={{ color: theme.semantic.intent.success.solid }}
                  />
                ) : (
                  <Circle
                    size={20}
                    strokeWidth={2.5}
                    aria-label="Not complete"
                    style={{ color: theme.semantic.text.muted }}
                  />
                )}
                <div style={bodyStackStyle(theme)}>
                  <span style={stepTitleStyle(theme)}>{step.label}</span>
                  {step.description ? (
                    <span style={bodyTextStyle(theme)}>{step.description}</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}

export function ActionHelp({
  label,
  help,
  unavailableReason,
  className,
  style,
}: ActionHelpProps) {
  const theme = useTheme();
  const helpId = useId();
  const reasonId = useId();
  const hasHelp = help !== undefined && help !== null;
  const hasReason =
    unavailableReason !== undefined && unavailableReason !== null;
  const describedBy = [
    hasHelp ? helpId : undefined,
    hasReason ? reasonId : undefined,
  ].filter(Boolean);
  return (
    <article
      className={className}
      aria-describedby={describedBy.join(" ") || undefined}
      style={{
        display: "grid",
        gap: theme.space[2],
        minWidth: 0,
        padding: theme.space[3],
        borderRadius: theme.radius.md,
        border: `1px solid ${theme.semantic.border.subtle}`,
        background: theme.semantic.surface.inset,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: theme.space[2],
          minWidth: 0,
        }}
      >
        <HelpCircle
          size={18}
          strokeWidth={2.5}
          aria-hidden="true"
          style={{
            color: theme.semantic.intent.info.solid,
            flex: "0 0 auto",
          }}
        />
        <h3 style={actionTitleStyle(theme)}>{label}</h3>
      </div>
      {hasHelp ? (
        <p id={helpId} style={bodyTextStyle(theme)}>
          {help}
        </p>
      ) : null}
      {hasReason ? (
        <div
          id={reasonId}
          role="status"
          style={{
            ...chipStyle(theme, { variant: "warning" }),
            justifySelf: "start",
            display: "inline-flex",
            alignItems: "center",
            gap: theme.space[1],
            maxWidth: "100%",
            whiteSpace: "normal",
          }}
        >
          <AlertCircle size={14} strokeWidth={2.5} aria-hidden="true" />
          <span>{unavailableReason}</span>
        </div>
      ) : null}
    </article>
  );
}

function guidanceContainerStyle(theme: Theme): CSSProperties {
  return {
    display: "grid",
    gap: theme.space[4],
    minWidth: 0,
    color: theme.semantic.text.primary,
    fontFamily: theme.typography.fontFamily.body,
  };
}

function headerStyle(theme: Theme): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "24px minmax(0, 1fr)",
    gap: theme.space[3],
    alignItems: "start",
    minWidth: 0,
  };
}

function bodyStackStyle(theme: Theme): CSSProperties {
  return {
    display: "grid",
    gap: theme.space[1],
    minWidth: 0,
  };
}

function titleStyle(theme: Theme): CSSProperties {
  return {
    margin: 0,
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.tight,
    color: theme.semantic.text.primary,
  };
}

function actionTitleStyle(theme: Theme): CSSProperties {
  return {
    margin: 0,
    minWidth: 0,
    overflowWrap: "anywhere",
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.tight,
    color: theme.semantic.text.primary,
  };
}

function stepTitleStyle(theme: Theme): CSSProperties {
  return {
    minWidth: 0,
    overflowWrap: "anywhere",
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.tight,
    color: theme.semantic.text.primary,
  };
}

function bodyTextStyle(theme: Theme): CSSProperties {
  return {
    margin: 0,
    minWidth: 0,
    overflowWrap: "anywhere",
    color: theme.semantic.text.muted,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.normal,
  };
}

function objectiveTextStyle(theme: Theme): CSSProperties {
  return {
    ...bodyTextStyle(theme),
    color: theme.semantic.text.primary,
    fontWeight: theme.typography.fontWeight.medium,
  };
}
