/**
 * GameSkeleton - Loading state component
 *
 * Displays animated placeholders while game content loads
 */

import { motion } from "framer-motion";
import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

const CARD_SKELETON_KEYS = ["card-1", "card-2", "card-3", "card-4", "card-5"];
const PLAYER_SKELETON_KEYS = ["player-1", "player-2", "player-3", "player-4"];
const HAND_SKELETON_KEYS = [
  "hand-card-1",
  "hand-card-2",
  "hand-card-3",
  "hand-card-4",
  "hand-card-5",
  "hand-card-6",
];

export interface GameSkeletonProps {
  variant?: "default" | "cards" | "players" | "minimal";
  message?: string;
  className?: string;
}
function SkeletonBox({
  className,
  animate = true,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <motion.div
      className={clsx("bg-slate-200 rounded", className)}
      animate={
        animate
          ? {
              opacity: [0.5, 1, 0.5],
            }
          : undefined
      }
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      aria-hidden="true"
    />
  );
}

function CardSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-16 h-24 sm:w-20 sm:h-28",
    md: "w-20 h-32 sm:w-24 sm:h-36",
    lg: "w-24 h-36 sm:w-32 sm:h-48",
  };

  return (
    <motion.div
      className={clsx(
        "rounded-lg sm:rounded-xl overflow-hidden",
        sizeClasses[size],
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <SkeletonBox className="w-full h-full" />
    </motion.div>
  );
}

function PlayerSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/80 rounded-xl border-2 border-slate-200">
      <SkeletonBox className="w-12 h-12 sm:w-14 sm:h-14 rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonBox className="h-4 w-24 sm:w-32" />
        <SkeletonBox className="h-3 w-16 sm:w-20" />
      </div>
    </div>
  );
}

export function GameSkeleton({
  variant = "default",
  message = "Loading game...",
  className,
}: GameSkeletonProps) {
  if (variant === "minimal") {
    return (
      <div
        className={clsx(
          "flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100",
          className,
        )}
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 size={48} className="text-blue-500" aria-hidden="true" />
        </motion.div>
        <motion.p
          className="mt-4 text-slate-600 text-lg font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div
        className={clsx(
          "flex flex-col items-center justify-center min-h-screen p-4 sm:p-8",
          className,
        )}
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        <div className="flex gap-2 sm:gap-4 mb-8">
          {CARD_SKELETON_KEYS.map((key, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <CardSkeleton />
            </motion.div>
          ))}
        </div>
        <motion.p
          className="text-slate-600 text-sm sm:text-base"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {message}
        </motion.p>
      </div>
    );
  }

  if (variant === "players") {
    return (
      <div
        className={clsx(
          "flex flex-col items-center justify-center min-h-screen p-4 sm:p-8",
          className,
        )}
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        <div className="w-full max-w-md space-y-4 mb-8">
          {PLAYER_SKELETON_KEYS.map((key, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <PlayerSkeleton />
            </motion.div>
          ))}
        </div>
        <motion.p
          className="text-slate-600 text-sm sm:text-base"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {message}
        </motion.p>
      </div>
    );
  }

  // Default variant - complete game layout
  return (
    <div
      className={clsx(
        "min-h-screen p-4 sm:p-8 bg-gradient-to-br from-slate-50 to-slate-100",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <SkeletonBox className="h-8 w-32 sm:w-48" />
        <SkeletonBox className="h-8 w-20 sm:w-32" />
      </div>

      {/* Players */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {PLAYER_SKELETON_KEYS.map((key, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <PlayerSkeleton />
          </motion.div>
        ))}
      </div>

      {/* Play area */}
      <div className="mb-6 sm:mb-8">
        <SkeletonBox className="w-full h-48 sm:h-64 rounded-2xl" />
      </div>

      {/* Hand */}
      <div className="flex justify-center gap-2 sm:gap-4">
        {HAND_SKELETON_KEYS.map((key, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.05 }}
          >
            <CardSkeleton />
          </motion.div>
        ))}
      </div>

      {/* Loading message */}
      <motion.div
        className="flex items-center justify-center mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <Loader2
          size={24}
          className="text-blue-500 animate-spin mr-3"
          aria-hidden="true"
        />
        <p className="text-slate-600 text-sm sm:text-base font-medium">
          {message}
        </p>
      </motion.div>
    </div>
  );
}
