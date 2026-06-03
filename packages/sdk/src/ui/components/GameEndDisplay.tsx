/**
 * End-of-game winner display and scoreboard overlay.
 *
 * Visual styling derives entirely from the active {@link useTheme}
 * (semantic + intent + elevation tokens). The win moment is the
 * Peak-end anchor of the session, so the surface intentionally pushes
 * the loudest theme signals (display typeface, primary intent,
 * elevation.overlay) without inventing one-off colours.
 */

import { motion } from "framer-motion";
import { Trophy, Home, Crown, Medal } from "lucide-react";
import { useEffect, useState } from "react";
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

export interface PlayerScore {
  playerId: string;
  name: string;
  score: number;
  isWinner?: boolean;
  details?: Record<string, number>;
}

export interface GameEndDisplayProps {
  isGameOver: boolean;
  /** Sorted by rank */
  scores: PlayerScore[];
  winnerMessage?: string;
  showDetails?: boolean;
  onReturnToLobby?: () => void;
  className?: string;
}

function rankIntent(rank: number): ButtonVariant {
  if (rank === 1) return "warning"; // gold
  if (rank === 2) return "secondary"; // silver
  if (rank === 3) return "info"; // bronze-ish (no bronze in palette)
  return "secondary";
}

function RankIcon({ rank, theme }: { rank: number; theme: Theme }) {
  const intent = intentForVariant(theme, rankIntent(rank));
  if (rank === 1) {
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
  if (rank === 2 || rank === 3) {
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
      #{rank}
    </span>
  );
}

export function GameEndDisplay({
  isGameOver,
  scores,
  winnerMessage,
  showDetails = false,
  onReturnToLobby,
  className,
}: GameEndDisplayProps) {
  const theme = useTheme();
  const reducedMotion = theme.motion.reducedMotion === "true";
  const [isOpen, setIsOpen] = useState(isGameOver);

  useEffect(() => {
    setIsOpen(isGameOver);
  }, [isGameOver]);

  if (!isGameOver) return null;

  const winner = scores.find((s) => s.isWinner) || scores[0];
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const winningIntent = theme.semantic.intent.warning;
  const title = `${winner?.name ?? "Game"} Wins!`;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className={`border-0 p-6 text-center shadow-none sm:max-w-lg ${className ?? ""}`}
        overlayClassName="bg-black/50 backdrop-blur-md"
        aria-describedby={undefined}
        style={{
          ...surfaceStyle(theme, { tone: "sheet", radius: "hud" }),
          width: "100%",
          maxWidth: 480,
          padding: `${theme.space[8]} ${theme.space[6]}`,
          textAlign: "center",
          boxShadow: theme.elevation.overlay,
          overflow: "hidden",
          backgroundImage: `radial-gradient(circle at top, ${winningIntent.soft} 0%, ${theme.semantic.surface.sheet} 60%)`,
          fontFamily: theme.typography.fontFamily.body,
        }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        {/* Trophy badge */}
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
            background: winningIntent.soft,
            border: `3px solid ${winningIntent.border}`,
            boxShadow: theme.elevation.lifted,
          }}
        >
          <Trophy
            width={48}
            height={48}
            strokeWidth={2.5}
            aria-hidden="true"
            style={{ color: winningIntent.solid }}
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
              fontFamily: theme.typography.fontFamily.display,
              fontSize: theme.typography.fontSize["3xl"],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.semantic.text.primary,
              marginBottom: theme.space[2],
              lineHeight: theme.typography.lineHeight.tight,
            }}
          >
            {title}
          </h2>
          {winnerMessage && (
            <p
              style={{
                margin: 0,
                marginBottom: theme.space[6],
                display: "inline-block",
                ...chipStyle(theme, { variant: "warning", size: "md" }),
                fontSize: theme.typography.fontSize.sm,
              }}
            >
              {winnerMessage}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reducedMotion ? 0 : 0.6 }}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.space[3],
            marginBottom: theme.space[8],
            textAlign: "left",
          }}
          role="list"
          aria-label="Final scores"
        >
          {sortedScores.map((player, index) => {
            const rank = index + 1;
            const intent = intentForVariant(theme, rankIntent(rank));
            const isWinner = player.isWinner ?? rank === 1;
            return (
              <motion.div
                key={player.playerId}
                initial={
                  reducedMotion ? { opacity: 0 } : { opacity: 0, x: -20 }
                }
                animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                transition={{
                  delay: reducedMotion ? 0 : 0.6 + index * 0.1,
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: theme.space[3],
                  background: isWinner
                    ? intent.soft
                    : theme.semantic.surface.card,
                  border: `1px solid ${
                    isWinner ? intent.border : theme.semantic.border.subtle
                  }`,
                  borderRadius: theme.radius.lg,
                  boxShadow: isWinner
                    ? theme.elevation.hover
                    : theme.elevation.rest,
                }}
                role="listitem"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: theme.space[3],
                  }}
                >
                  <RankIcon rank={rank} theme={theme} />
                  <span
                    style={{
                      fontFamily: theme.typography.fontFamily.body,
                      fontSize: theme.typography.fontSize.lg,
                      fontWeight: theme.typography.fontWeight.bold,
                      color: isWinner
                        ? intent.onSoft
                        : theme.semantic.text.primary,
                    }}
                  >
                    {player.name}
                  </span>
                  {isWinner && (
                    <Crown
                      width={20}
                      height={20}
                      strokeWidth={3}
                      aria-label="Winner"
                      style={{ color: intent.solid }}
                    />
                  )}
                </div>
                <span
                  style={{
                    fontFamily: theme.typography.fontFamily.tabular,
                    fontSize: theme.typography.fontSize["2xl"],
                    fontWeight: theme.typography.fontWeight.bold,
                    color: isWinner
                      ? intent.onSoft
                      : theme.semantic.text.primary,
                    paddingInline: theme.space[2],
                    paddingBlock: theme.space[0.5],
                    background: theme.semantic.surface.inset,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.semantic.border.subtle}`,
                  }}
                >
                  {player.score}
                </span>
              </motion.div>
            );
          })}
        </motion.div>

        {showDetails && winner?.details && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reducedMotion ? 0 : 0.8 }}
            style={{
              marginBottom: theme.space[8],
              padding: theme.space[4],
              background: theme.semantic.surface.inset,
              border: `1px dashed ${theme.semantic.border.default}`,
              borderRadius: theme.radius.lg,
              textAlign: "left",
            }}
          >
            <h3
              style={{
                margin: 0,
                marginBottom: theme.space[3],
                fontFamily: theme.typography.fontFamily.display,
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.semantic.text.primary,
                display: "flex",
                alignItems: "center",
                gap: theme.space[2],
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: theme.semantic.intent.primary.solid,
                  borderRadius: theme.radius.pill,
                  display: "inline-block",
                }}
              />
              Score Breakdown
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: theme.space[2],
              }}
            >
              {Object.entries(winner.details).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: theme.typography.fontSize.md,
                    color: theme.semantic.text.primary,
                  }}
                >
                  <span style={{ textTransform: "capitalize" }}>
                    {key.replace(/([A-Z])/g, " $1")}
                  </span>
                  <span
                    style={{
                      fontFamily: theme.typography.fontFamily.tabular,
                      fontWeight: theme.typography.fontWeight.bold,
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

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
