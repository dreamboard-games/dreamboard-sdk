import { clsx } from "clsx";
import { motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../internal/ui/dialog.js";
import { surfaceStyle } from "../theme/derive.js";
import { useTheme, useThemeCssVars } from "../theme/ThemeProvider.js";
import { normalizeDiceState, type DiceValue } from "../primitives/dice.js";
import { ThemedButton } from "./ThemedButton.js";

export interface DiceRollerRenderProps {
  values: ReadonlyArray<number | undefined> | undefined;
  /** Undefined if any die hasn't been rolled */
  sum: number | undefined;
  diceCount: number;
  allRolled: boolean;
}

export interface DiceRollerRollAction {
  /** Controlled action callback supplied by the runtime or application. */
  onRoll?: () => void | Promise<void>;
  available?: boolean;
  disabledReason?: string;
  title?: ReactNode;
  description?: ReactNode;
  rollLabel?: ReactNode;
  resultLabel?: ReactNode;
  minSpinMs?: number;
  revealHoldMs?: number;
}

export interface DiceRollerProps {
  values?: readonly DiceValue[] | null;
  /** Used when values not provided */
  diceCount?: number;
  render?: (props: DiceRollerRenderProps) => ReactNode;
  /** Optional controlled dialog flow for actions such as `rollDice`. */
  rollAction?: DiceRollerRollAction;
  className?: string;
}

type RollPhase = "idle" | "rolling" | "revealed";

const DEFAULT_MIN_SPIN_MS = 1200;
const DEFAULT_REVEAL_HOLD_MS = 1400;
const FACE_SEQUENCE = [1, 2, 3, 4, 5, 6] as const;

export function DiceRoller({
  values,
  diceCount = 2,
  render,
  rollAction,
  className,
}: DiceRollerProps) {
  const renderProps = normalizeDiceState({ values, count: diceCount });

  return (
    <div
      className={clsx("flex flex-col items-center gap-4", className)}
      role="region"
      aria-label="Dice roller"
    >
      {render ? render(renderProps) : <DefaultDiceReadout {...renderProps} />}

      {rollAction ? (
        <DiceRollDialog
          action={rollAction}
          values={renderProps.values}
          diceCount={renderProps.diceCount}
        />
      ) : null}

      {/* Screen reader only: dice info */}
      <div className="sr-only" aria-live="polite">
        {renderProps.allRolled && renderProps.values
          ? `Rolled ${renderProps.values.join(", ")}. Total: ${renderProps.sum}`
          : "Dice not rolled yet"}
      </div>
    </div>
  );
}

function DefaultDiceReadout({
  values,
  sum,
  diceCount,
  allRolled,
}: DiceRollerRenderProps) {
  const theme = useTheme();
  const dice = values ?? Array(diceCount).fill(undefined);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: theme.space[2],
      }}
    >
      {allRolled ? (
        <strong
          style={{
            fontFamily: theme.typography.fontFamily.display,
            fontSize: theme.typography.fontSize.lg,
            color: theme.semantic.text.primary,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          Total {sum}
        </strong>
      ) : null}
      <DiceRow values={dice} size={44} rolling={false} />
    </div>
  );
}

function DiceRollDialog({
  action,
  values,
  diceCount,
}: {
  action: DiceRollerRollAction;
  values: ReadonlyArray<number | undefined> | undefined;
  diceCount: number;
}) {
  const theme = useTheme();
  const themeCssVars = useThemeCssVars();
  const reducedMotion = theme.motion.reducedMotion === "true";
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<RollPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [animatedValues, setAnimatedValues] = useState<number[]>(() =>
    nextAnimatedValues(diceCount),
  );
  const [revealedValues, setRevealedValues] = useState<
    Array<number | undefined> | undefined
  >(undefined);
  const startedAtRef = useRef(0);
  const revealedRollKeyRef = useRef<string | null>(null);

  const shouldPresentDialog = Boolean(action.onRoll);
  const minSpinMs = reducedMotion
    ? 0
    : (action.minSpinMs ?? DEFAULT_MIN_SPIN_MS);
  const revealHoldMs = action.revealHoldMs ?? DEFAULT_REVEAL_HOLD_MS;
  const rolledValuesKey = values?.join(",") ?? "";
  const valuesAreReady =
    values !== undefined &&
    values.length > 0 &&
    values.every((value) => typeof value === "number");

  useEffect(() => {
    if (!shouldPresentDialog) {
      setOpen(false);
      return;
    }
    if (!valuesAreReady) {
      revealedRollKeyRef.current = null;
      setOpen(true);
      if (phase !== "rolling") {
        setPhase("idle");
        setRevealedValues(undefined);
        setError(null);
      }
      return;
    }
    if (
      open &&
      phase === "idle" &&
      revealedRollKeyRef.current !== rolledValuesKey
    ) {
      startedAtRef.current = Date.now();
      setPhase("rolling");
      setAnimatedValues(nextAnimatedValues(diceCount));
    }
  }, [
    diceCount,
    open,
    phase,
    rolledValuesKey,
    shouldPresentDialog,
    valuesAreReady,
  ]);

  useEffect(() => {
    if (phase !== "rolling") return;
    if (reducedMotion) return;
    const interval = setInterval(() => {
      setAnimatedValues(nextAnimatedValues(diceCount));
    }, 120);
    return () => clearInterval(interval);
  }, [diceCount, phase, reducedMotion]);

  useEffect(() => {
    if (phase !== "rolling" || !valuesAreReady || !values) return;
    const remaining = Math.max(
      0,
      minSpinMs - (Date.now() - startedAtRef.current),
    );
    const timeout = setTimeout(() => {
      setRevealedValues([...values]);
      revealedRollKeyRef.current = rolledValuesKey;
      setPhase("revealed");
    }, remaining);
    return () => clearTimeout(timeout);
  }, [minSpinMs, phase, rolledValuesKey, values, valuesAreReady]);

  useEffect(() => {
    if (phase !== "revealed") return;
    const timeout = setTimeout(() => {
      setOpen(false);
      setPhase("idle");
    }, revealHoldMs);
    return () => clearTimeout(timeout);
  }, [phase, revealHoldMs]);

  const roll = useCallback(async () => {
    if (!action.onRoll || action.available === false || phase === "rolling") {
      return;
    }
    startedAtRef.current = Date.now();
    setOpen(true);
    setPhase("rolling");
    setError(null);
    setRevealedValues(undefined);
    setAnimatedValues(nextAnimatedValues(diceCount));
    try {
      await action.onRoll();
    } catch (caught) {
      setPhase("idle");
      setError(
        caught instanceof Error ? caught.message : "Unable to roll dice.",
      );
    }
  }, [action, diceCount, phase]);

  const displayValues =
    phase === "rolling"
      ? animatedValues
      : (revealedValues ?? values ?? Array(diceCount).fill(undefined));
  const displaySum = sumValues(displayValues);
  const title = action.title ?? "Roll dice";
  const description = action.description ?? "Roll to resolve the current turn.";
  const resultLabel = action.resultLabel ?? "Roll result";
  const rollLabel = action.rollLabel ?? "Roll dice";
  const disabled = action.available === false || phase === "rolling";
  const canClose = true;

  return (
    <Dialog open={open} onOpenChange={canClose ? setOpen : undefined}>
      <DialogContent
        data-dismiss-behavior="dismiss"
        showCloseButton={canClose}
        className="max-h-[calc(100vh-2rem)] overflow-y-auto p-4 sm:max-w-md sm:p-6"
        style={{
          ...themeCssVars,
          ...surfaceStyle(theme, { tone: "sheet", radius: "lg" }),
          width: "min(100%, 28rem)",
          fontFamily: theme.typography.fontFamily.body,
        }}
        onEscapeKeyDown={
          canClose ? undefined : (event: Event) => event.preventDefault()
        }
        onInteractOutside={
          canClose ? undefined : (event: Event) => event.preventDefault()
        }
      >
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle
            style={{
              fontFamily: theme.typography.fontFamily.display,
              fontSize: theme.typography.fontSize.xl,
            }}
          >
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: theme.space[4],
          }}
        >
          <RollResult label={resultLabel} sum={displaySum} phase={phase} />
          <DiceRow
            values={displayValues}
            size={76}
            rolling={phase === "rolling"}
          />
          {error ? (
            <span
              role="alert"
              style={{
                color: theme.semantic.intent.danger.solid,
                fontSize: theme.typography.fontSize.sm,
                textAlign: "center",
              }}
            >
              {error}
            </span>
          ) : null}
          <ThemedButton
            type="button"
            variant="primary"
            size="lg"
            disabled={disabled}
            pressed={phase === "rolling"}
            onClick={(event) => {
              event.preventDefault();
              void roll();
            }}
          >
            {phase === "rolling" ? "Rolling..." : rollLabel}
          </ThemedButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RollResult({
  label,
  sum,
  phase,
}: {
  label: ReactNode;
  sum: number | undefined;
  phase: RollPhase;
}) {
  const theme = useTheme();
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        ...surfaceStyle(theme, { tone: "inset", radius: "lg" }),
        width: "100%",
        padding: `${theme.space[3]} ${theme.space[4]}`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          color: theme.semantic.text.muted,
          fontSize: theme.typography.fontSize.xs,
          fontWeight: theme.typography.fontWeight.bold,
          letterSpacing: theme.typography.letterSpacing.wide,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: theme.typography.fontFamily.display,
          fontSize: "clamp(2.75rem, 12vw, 4.5rem)",
          fontWeight: theme.typography.fontWeight.bold,
          lineHeight: 1,
          color: theme.semantic.text.primary,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {sum ?? (phase === "rolling" ? "..." : "?")}
      </div>
    </div>
  );
}

function DiceRow({
  values,
  size,
  rolling,
}: {
  values: ReadonlyArray<number | undefined>;
  size: number;
  rolling: boolean;
}) {
  const gap = Math.max(8, Math.round(size * 0.18));
  return (
    <div
      role="list"
      aria-label="Dice values"
      style={{
        display: "flex",
        justifyContent: "center",
        gap,
        flexWrap: "wrap",
      }}
    >
      {values.map((value, index) => (
        <DieFace
          key={index}
          value={value}
          size={size}
          rolling={rolling}
          index={index}
        />
      ))}
    </div>
  );
}

function DieFace({
  value,
  size,
  rolling,
  index,
}: {
  value: number | undefined;
  size: number;
  rolling: boolean;
  index: number;
}) {
  const theme = useTheme();
  const reducedMotion = theme.motion.reducedMotion === "true";
  const showPips = typeof value === "number" && value >= 1 && value <= 6;
  const style: CSSProperties = {
    position: "relative",
    width: size,
    height: size,
    borderRadius: Math.max(10, Math.round(size * 0.2)),
    border: `1px solid ${theme.semantic.border.default}`,
    background: `linear-gradient(145deg, ${theme.semantic.surface.card}, ${theme.semantic.surface.inset})`,
    boxShadow: `${theme.elevation.lifted}, inset 0 1px 0 rgba(255,255,255,0.45)`,
    color: theme.semantic.text.primary,
    display: "grid",
    placeItems: "center",
    flex: "0 0 auto",
    overflow: "hidden",
  };
  return (
    <motion.div
      role="listitem"
      aria-label={
        typeof value === "number"
          ? `Die ${index + 1}: ${value}`
          : `Die ${index + 1}: not rolled`
      }
      style={style}
      animate={
        rolling && !reducedMotion
          ? {
              rotate: [0, 12, -10, 0],
              y: [0, -8, 0],
              scale: [1, 1.04, 1],
            }
          : { rotate: 0, y: 0, scale: 1 }
      }
      transition={
        rolling && !reducedMotion
          ? {
              repeat: Infinity,
              duration: 0.42,
              delay: index * 0.06,
              ease: "easeInOut",
            }
          : { duration: 0.2 }
      }
    >
      {showPips ? (
        <PipFace value={value} />
      ) : (
        <span
          style={{
            fontFamily: theme.typography.fontFamily.display,
            fontSize: Math.round(size * 0.42),
            fontWeight: theme.typography.fontWeight.bold,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value ?? "?"}
        </span>
      )}
    </motion.div>
  );
}

function PipFace({ value }: { value: number }) {
  const theme = useTheme();
  const pips = pipPositions(value);
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        inset: "18%",
      }}
    >
      {pips.map(([left, top], index) => (
        <span
          key={`${left}-${top}-${index}`}
          style={{
            position: "absolute",
            left: `${left}%`,
            top: `${top}%`,
            width: "22%",
            height: "22%",
            borderRadius: "9999px",
            transform: "translate(-50%, -50%)",
            background: theme.semantic.text.primary,
            boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
          }}
        />
      ))}
    </span>
  );
}

function pipPositions(value: number): Array<[number, number]> {
  switch (value) {
    case 1:
      return [[50, 50]];
    case 2:
      return [
        [28, 28],
        [72, 72],
      ];
    case 3:
      return [
        [28, 28],
        [50, 50],
        [72, 72],
      ];
    case 4:
      return [
        [28, 28],
        [72, 28],
        [28, 72],
        [72, 72],
      ];
    case 5:
      return [
        [28, 28],
        [72, 28],
        [50, 50],
        [28, 72],
        [72, 72],
      ];
    case 6:
      return [
        [28, 25],
        [72, 25],
        [28, 50],
        [72, 50],
        [28, 75],
        [72, 75],
      ];
    default:
      return [];
  }
}

function nextAnimatedValues(count: number): number[] {
  return Array.from({ length: count }, (_, index) => {
    const offset = Math.floor(Math.random() * FACE_SEQUENCE.length);
    return FACE_SEQUENCE[(offset + index) % FACE_SEQUENCE.length] ?? 1;
  });
}

function sumValues(
  values: ReadonlyArray<number | undefined>,
): number | undefined {
  if (!values.every((value) => typeof value === "number")) return undefined;
  return values.reduce((total, value) => total + (value ?? 0), 0);
}
