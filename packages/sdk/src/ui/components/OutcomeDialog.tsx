import { motion } from "framer-motion";
import { Home, Medal, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { GameOutcome, OutcomeStanding } from "../../reducer.js";
import { Dialog, DialogContent, DialogTitle } from "../internal/ui/dialog.js";
import { useTheme } from "../theme/ThemeProvider.js";
import {
  chipStyle,
  intentForVariant,
  surfaceStyle,
  type ButtonVariant,
} from "../theme/derive.js";
import type { Theme } from "../theme/tokens.js";
import { ThemedButton } from "./ThemedButton.js";

export interface StandingsTableProps<PlayerId extends string = string> {
  rows: readonly OutcomeStanding<PlayerId>[];
  playerName: (playerId: PlayerId) => ReactNode;
  provisional?: boolean;
  className?: string;
}

export interface OutcomeDialogProps<PlayerId extends string = string> {
  outcome?: GameOutcome<PlayerId> | null;
  playerName: (playerId: PlayerId) => ReactNode;
  onReturnToLobby?: () => void;
  className?: string;
}

function rankIntent(row: OutcomeStanding): Exclude<ButtonVariant, "ghost"> {
  if (row.result === "win") return "warning";
  if (row.result === "draw") return "info";
  if (row.result === "eliminated") return "danger";
  if (row.rank === 1) return "secondary";
  return "secondary";
}

function RankIcon({ row, theme }: { row: OutcomeStanding; theme: Theme }) {
  const intent = intentForVariant(theme, rankIntent(row));
  if (row.result === "win") {
    return (
      <Trophy
        width={20}
        height={20}
        strokeWidth={3}
        aria-hidden="true"
        style={{ color: intent.solid }}
      />
    );
  }
  if (row.rank <= 3) {
    return (
      <Medal
        width={20}
        height={20}
        strokeWidth={2.5}
        aria-hidden="true"
        style={{ color: intent.solid }}
      />
    );
  }
  return (
    <span
      style={{
        width: 20,
        textAlign: "center",
        color: theme.semantic.text.muted,
        fontFamily: theme.typography.fontFamily.tabular,
        fontWeight: theme.typography.fontWeight.bold,
      }}
    >
      #{row.rank}
    </span>
  );
}

function resultLabel(result: OutcomeStanding["result"]) {
  if (result === "win") return "Win";
  if (result === "draw") return "Draw";
  if (result === "loss") return "Loss";
  return "Eliminated";
}

function outcomeTitle(outcome: GameOutcome) {
  const rows = outcome.standings;
  const rankOneRows = rows.filter((row) => row.rank === 1);
  if (
    rankOneRows.length > 1 &&
    rankOneRows.every((row) => row.result === "draw")
  ) {
    return "Draw";
  }
  if (rows.length > 0 && rows.every((row) => row.result === "win")) {
    return "Team Victory";
  }
  if (rankOneRows.length === 1 && rankOneRows[0]?.result === "win") {
    return "Game Complete";
  }
  return "Game Complete";
}

function DetailsList({
  label,
  entries,
}: {
  label: string;
  entries: readonly { id: string; label: string; value: number | string }[];
}) {
  const theme = useTheme();
  if (entries.length === 0) return null;
  return (
    <div>
      <div
        style={{
          marginBottom: theme.space[1],
          color: theme.semantic.text.muted,
          fontSize: theme.typography.fontSize.xs,
          fontWeight: theme.typography.fontWeight.bold,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <dl
        style={{
          display: "grid",
          gap: theme.space[1],
          margin: 0,
        }}
      >
        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: theme.space[3],
              color: theme.semantic.text.muted,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            <dt>{entry.label}</dt>
            <dd
              style={{
                margin: 0,
                fontFamily: theme.typography.fontFamily.tabular,
                fontWeight: theme.typography.fontWeight.bold,
              }}
            >
              {entry.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function StandingsTable<PlayerId extends string = string>({
  rows,
  playerName,
  provisional = false,
  className,
}: StandingsTableProps<PlayerId>) {
  const theme = useTheme();
  return (
    <div
      className={className}
      role="table"
      aria-label={provisional ? "Provisional standings" : "Final standings"}
      style={{
        display: "grid",
        gap: theme.space[3],
      }}
    >
      {rows.map((row) => {
        const intent = intentForVariant(theme, rankIntent(row));
        const emphasized = row.result === "win" || row.result === "draw";
        return (
          <div
            key={row.playerId}
            role="row"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              gap: theme.space[3],
              alignItems: "start",
              padding: theme.space[3],
              background: emphasized
                ? intent.soft
                : theme.semantic.surface.card,
              border: `1px solid ${
                emphasized ? intent.border : theme.semantic.border.subtle
              }`,
              borderRadius: theme.radius.lg,
              boxShadow: emphasized
                ? theme.elevation.hover
                : theme.elevation.rest,
            }}
          >
            <div
              style={{
                display: "grid",
                gap: theme.space[2],
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: theme.space[3],
                  minWidth: 0,
                }}
              >
                <RankIcon row={row} theme={theme} />
                <span
                  style={{
                    minWidth: 0,
                    overflowWrap: "anywhere",
                    color: emphasized
                      ? intent.onSoft
                      : theme.semantic.text.primary,
                    fontFamily: theme.typography.fontFamily.body,
                    fontSize: theme.typography.fontSize.lg,
                    fontWeight: theme.typography.fontWeight.bold,
                  }}
                >
                  {playerName(row.playerId)}
                </span>
                <span
                  style={{
                    ...chipStyle(theme, {
                      variant: rankIntent(row),
                      size: "sm",
                    }),
                    flexShrink: 0,
                  }}
                >
                  {resultLabel(row.result)}
                </span>
              </div>

              <DetailsList
                label="Breakdown"
                entries={row.scoreBreakdown ?? []}
              />
              <DetailsList label="Tie-breaks" entries={row.tieBreaks ?? []} />
            </div>

            <div
              role="cell"
              aria-label={`Rank ${row.rank}${row.score === undefined ? "" : `, score ${row.score}`}`}
              style={{
                display: "grid",
                gap: theme.space[1],
                justifyItems: "end",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  color: theme.semantic.text.muted,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.bold,
                  textTransform: "uppercase",
                }}
              >
                Rank {row.rank}
              </span>
              {row.score !== undefined && (
                <span
                  style={{
                    paddingInline: theme.space[2],
                    paddingBlock: theme.space[0.5],
                    background: theme.semantic.surface.inset,
                    border: `1px solid ${theme.semantic.border.subtle}`,
                    borderRadius: theme.radius.md,
                    color: theme.semantic.text.primary,
                    fontFamily: theme.typography.fontFamily.tabular,
                    fontSize: theme.typography.fontSize["2xl"],
                    fontWeight: theme.typography.fontWeight.bold,
                  }}
                >
                  {row.score}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OutcomeDialog<PlayerId extends string = string>({
  outcome,
  playerName,
  onReturnToLobby,
  className,
}: OutcomeDialogProps<PlayerId>) {
  const theme = useTheme();
  const reducedMotion = theme.motion.reducedMotion === "true";
  const [isOpen, setIsOpen] = useState(Boolean(outcome));

  useEffect(() => {
    setIsOpen(Boolean(outcome));
  }, [outcome]);

  if (!outcome) return null;

  const title = outcomeTitle(outcome);
  const message = outcome.reason.message ?? outcome.reason.code;
  const titleIntent = intentForVariant(
    theme,
    outcome.standings.some((row) => row.result === "win") ? "warning" : "info",
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className={`border-0 p-6 text-center shadow-none sm:max-w-lg ${className ?? ""}`}
        overlayClassName="bg-black/50 backdrop-blur-md"
        aria-describedby={undefined}
        style={{
          ...surfaceStyle(theme, { tone: "sheet", radius: "hud" }),
          width: "100%",
          maxWidth: 560,
          padding: `${theme.space[8]} ${theme.space[6]}`,
          textAlign: "center",
          boxShadow: theme.elevation.overlay,
          overflow: "hidden",
          backgroundImage: `radial-gradient(circle at top, ${titleIntent.soft} 0%, ${theme.semantic.surface.sheet} 60%)`,
          fontFamily: theme.typography.fontFamily.body,
        }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        <motion.div
          initial={
            reducedMotion
              ? { scale: 1 }
              : { scale: 0.95, rotate: -180, opacity: 0 }
          }
          animate={
            reducedMotion ? { scale: 1 } : { scale: 1, rotate: 0, opacity: 1 }
          }
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: reducedMotion ? 0 : 0.2,
          }}
          style={{
            marginBottom: theme.space[6],
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: theme.radius.pill,
            background: titleIntent.soft,
            border: `3px solid ${titleIntent.border}`,
            boxShadow: theme.elevation.lifted,
          }}
        >
          <Trophy
            width={48}
            height={48}
            strokeWidth={2.5}
            aria-hidden="true"
            style={{ color: titleIntent.solid }}
          />
        </motion.div>

        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ delay: reducedMotion ? 0 : 0.4 }}
        >
          <h2
            aria-hidden="true"
            style={{
              margin: 0,
              marginBottom: theme.space[2],
              color: theme.semantic.text.primary,
              fontFamily: theme.typography.fontFamily.display,
              fontSize: theme.typography.fontSize["3xl"],
              fontWeight: theme.typography.fontWeight.bold,
              lineHeight: theme.typography.lineHeight.tight,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              margin: 0,
              marginBottom: theme.space[6],
              display: "inline-block",
              ...chipStyle(theme, { variant: "secondary", size: "md" }),
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            {message}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reducedMotion ? 0 : 0.6 }}
          style={{
            marginBottom: onReturnToLobby ? theme.space[8] : 0,
            textAlign: "left",
          }}
        >
          <StandingsTable rows={outcome.standings} playerName={playerName} />
        </motion.div>

        {onReturnToLobby && (
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ delay: reducedMotion ? 0 : 1 }}
            style={{ display: "flex", justifyContent: "center" }}
          >
            <ThemedButton
              type="button"
              variant="primary"
              size="lg"
              onClick={onReturnToLobby}
              style={{
                gap: theme.space[2],
              }}
            >
              <Home size={20} strokeWidth={3} aria-hidden="true" />
              Return to Lobby
            </ThemedButton>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
