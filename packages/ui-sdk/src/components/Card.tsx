/**
 * Presentational card shell. Feed from reducer views, not runtime state.
 *
 * `CardFace` is the only public reusable card shell in `@dreamboard-games/ui-sdk`.
 * It renders display content with controlled {@link InteractionVisualState}
 * (eligible / selected / disabled / invalid / submitted / previewing) and
 * exposes stable `data-*` attributes. It does not own activation behavior —
 * compose it with a generic `<button>` (or with a runtime adapter) when an
 * authored surface needs to react to taps or keyboard activation.
 */

import { clsx } from "clsx";
import type { ViewCard } from "@dreamboard-games/sdk-types";
import { useTheme } from "../theme/ThemeProvider.js";
import { motionDuration } from "../theme/derive.js";
import {
  visualStateDataAttributes,
  type InteractionVisualState,
} from "../types/visual-state.js";

export interface CardFaceProps<CardData extends ViewCard = ViewCard>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    InteractionVisualState {
  card: CardData;
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
  renderContent?: (card: CardData) => React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Reserved keys on `ViewCard.properties` that the default content
 * renderer recognises and styles consistently. Authors who set these
 * keys at view-build time get a properly laid-out card face for free
 * (icon → title → subtitle → effect → cost), instead of the previous
 * "first three properties as label/value" fallback that produced
 * inconsistent card faces across games.
 *
 * Any other property keys are still rendered, just below the
 * conventional cluster, so authors can mix and match without losing
 * data — but the canonical surface should pick from these slots first.
 *
 * Slots:
 *
 * - `icon` — short visual flag (emoji, glyph). Rendered large at the
 *   top of the card.
 * - `title` — primary label. Falls back to `card.name`.
 * - `subtitle` — short qualifier ("1 VP", "Action", "Resource").
 * - `effect` — body text describing what the card does.
 * - `cost` — short cost line ("3 brick"); rendered as a chip footer.
 */
const RESERVED_CONTENT_KEYS = [
  "icon",
  "title",
  "subtitle",
  "effect",
  "cost",
] as const;

type ReservedKey = (typeof RESERVED_CONTENT_KEYS)[number];

const RESERVED_KEY_SET: ReadonlySet<string> = new Set(RESERVED_CONTENT_KEYS);

function readReserved(
  props: Record<string, unknown> | undefined,
  key: ReservedKey,
): string | undefined {
  if (!props) return undefined;
  const raw = props[key];
  if (raw === undefined || raw === null) return undefined;
  return String(raw);
}

/** Default card content renderer. */
function DefaultCardContent({
  card,
  size,
}: {
  card: ViewCard;
  size: NonNullable<CardFaceProps["size"]>;
}) {
  const theme = useTheme();
  const props = card.properties as Record<string, unknown> | undefined;
  const icon = readReserved(props, "icon");
  const title = readReserved(props, "title") ?? card.name;
  const subtitle = readReserved(props, "subtitle");
  const effect = readReserved(props, "effect");
  const cost = readReserved(props, "cost");
  const extra = props
    ? Object.entries(props).filter(([key]) => !RESERVED_KEY_SET.has(key))
    : [];

  const hasAnyReserved = icon || title || subtitle || effect || cost;
  const compact = size === "sm";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: "100%",
        minHeight: 0,
        boxSizing: "border-box",
        overflow: "hidden",
        textAlign: "center",
        padding: compact ? theme.space[1] : theme.space[2],
        gap: compact ? theme.space[0.5] : theme.space[1],
      }}
    >
      {icon ? (
        <span
          aria-hidden
          style={{
            flexShrink: 0,
            fontSize: compact
              ? theme.typography.fontSize.lg
              : theme.typography.fontSize["2xl"],
            lineHeight: 1,
          }}
        >
          {icon}
        </span>
      ) : null}
      {title ? (
        <span
          style={{
            flexShrink: 0,
            fontFamily: theme.typography.fontFamily.display,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.semantic.text.primary,
            lineHeight: theme.typography.lineHeight.tight,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            wordBreak: "break-word",
          }}
        >
          {title}
        </span>
      ) : null}
      {subtitle ? (
        <span
          style={{
            flexShrink: 0,
            fontFamily: theme.typography.fontFamily.body,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.semantic.text.muted,
            letterSpacing: theme.typography.letterSpacing.wide,
            textTransform: "uppercase",
          }}
        >
          {subtitle}
        </span>
      ) : null}
      {effect ? (
        <span
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            fontFamily: theme.typography.fontFamily.body,
            fontSize: theme.typography.fontSize.xs,
            color: theme.semantic.text.muted,
            lineHeight: theme.typography.lineHeight.normal,
            display: "-webkit-box",
            WebkitLineClamp: compact ? 1 : size === "md" ? 2 : 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {effect}
        </span>
      ) : null}
      {cost ? (
        <span
          style={{
            display: "inline-flex",
            flexShrink: 0,
            alignItems: "center",
            gap: theme.space[1],
            paddingBlock: theme.space[0.5],
            paddingInline: theme.space[2],
            borderRadius: theme.radius.pill,
            background: theme.semantic.surface.inset,
            border: `1px solid ${theme.semantic.border.subtle}`,
            fontFamily: theme.typography.fontFamily.tabular,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.semantic.text.primary,
            marginTop: "auto",
          }}
        >
          {cost}
        </span>
      ) : null}
      {!hasAnyReserved && extra.length > 0
        ? extra.slice(0, 3).map(([key, value]) => (
            <span
              key={key}
              style={{
                flexShrink: 0,
                fontFamily: theme.typography.fontFamily.body,
                fontSize: theme.typography.fontSize.xs,
                color: theme.semantic.text.primary,
              }}
            >
              <span style={{ color: theme.semantic.text.muted }}>{key}:</span>{" "}
              <span style={{ fontWeight: theme.typography.fontWeight.bold }}>
                {String(value)}
              </span>
            </span>
          ))
        : null}
      {!hasAnyReserved && extra.length === 0 ? (
        <span
          style={{
            flexShrink: 0,
            fontFamily: theme.typography.fontFamily.mono,
            fontSize: theme.typography.fontSize.xs,
            color: theme.semantic.text.disabled,
          }}
        >
          {card.id.slice(0, 8)}
        </span>
      ) : null}
    </div>
  );
}

const CARD_SIZE_CLASSES = {
  sm: "w-16 h-24 sm:w-20 sm:h-28",
  md: "w-20 h-32 sm:w-24 sm:h-36",
  lg: "w-24 h-36 sm:w-32 sm:h-48",
} as const;

export function CardFace<CardData extends ViewCard = ViewCard>({
  card,
  eligible,
  selected = false,
  disabled = false,
  invalid,
  submitted,
  previewing,
  intentProgress,
  size = "md",
  faceDown = false,
  renderContent,
  children,
  className,
  style,
  ...props
}: CardFaceProps<CardData>) {
  const theme = useTheme();
  const calmCornerRadius = theme.radius.md;
  const accentCornerRadius = `${theme.radius.lg} ${theme.radius.sm} ${theme.radius.lg} ${theme.radius.sm} / ${theme.radius.sm} ${theme.radius.lg} ${theme.radius.sm} ${theme.radius.lg}`;
  const selectionRingColor = theme.component.card.selectedRing;
  const eligibleRingColor = theme.semantic.intent.warning.border;
  const invalidRingColor = theme.semantic.intent.danger.border;
  const submittedRingColor = theme.semantic.intent.success.border;
  const restBorderColor = theme.component.card.border;
  const dataAttributes = visualStateDataAttributes({
    eligible,
    selected,
    disabled,
    invalid,
    submitted,
    previewing,
    intentProgress,
  });
  // Routine resting cards use a calm modern surface. Hard-shadow / irregular
  // corner accents are reserved for explicit emphasis states so a fanned
  // hand reads as ordered play instead of repeated decoration.
  const accentColor = invalid
    ? invalidRingColor
    : submitted
      ? submittedRingColor
      : selected
        ? selectionRingColor
        : previewing
          ? selectionRingColor
          : eligible
            ? eligibleRingColor
            : undefined;
  const isAccented = Boolean(accentColor);
  const accentShadow = selected
    ? `6px 6px 0px 0px ${selectionRingColor}`
    : previewing
      ? `4px 4px 0px 0px ${selectionRingColor}`
      : invalid
        ? `4px 4px 0px 0px ${invalidRingColor}`
        : submitted
          ? `4px 4px 0px 0px ${submittedRingColor}`
          : eligible
            ? `4px 4px 0px 0px ${eligibleRingColor}`
            : undefined;
  const restShadow = theme.elevation.rest;

  return (
    <div
      {...props}
      {...dataAttributes}
      data-dreamboard-card-face=""
      data-accented={isAccented ? "true" : undefined}
      data-face-down={faceDown ? "true" : undefined}
      className={clsx("relative", CARD_SIZE_CLASSES[size], className)}
      style={{
        opacity: disabled ? 0.5 : submitted ? 0.85 : 1,
        transitionProperty: "transform, box-shadow, border-color",
        transitionDuration: motionDuration(theme, "normal"),
        transitionTimingFunction: theme.motion.easing.out,
        transform: previewing ? "translateY(-2px) scale(1.02)" : undefined,
        ...style,
      }}
    >
      {faceDown ? (
        // Card back: keep the playful diagonal pattern as artwork, but
        // anchor the shell on the same calm baseline as a face-up card so
        // a row of opponent hands or a draw pile reads as ordered chrome
        // rather than repeated decoration. Emphasis states (selected,
        // eligible, invalid, submitted, previewing) still upgrade to the
        // accent radius + hard-offset shadow.
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{
            background: theme.component.card.backBackground,
            borderStyle: "solid",
            borderWidth: isAccented ? 3 : 1,
            borderColor: accentColor ?? restBorderColor,
            borderRadius: isAccented ? accentCornerRadius : calmCornerRadius,
            boxShadow: accentShadow ?? restShadow,
          }}
        >
          <div
            className="absolute inset-2"
            style={{
              borderRadius: calmCornerRadius,
              background:
                "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.2) 10px, rgba(255,255,255,0.2) 20px)",
            }}
          />
        </div>
      ) : (
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{
            background: submitted
              ? theme.semantic.intent.success.soft
              : theme.semantic.surface.card,
            borderStyle: "solid",
            borderWidth: isAccented ? 3 : 1,
            borderColor: accentColor ?? restBorderColor,
            borderRadius: isAccented ? accentCornerRadius : calmCornerRadius,
            boxShadow: accentShadow ?? restShadow,
            outline:
              selected || invalid
                ? `2px solid ${accentColor ?? selectionRingColor}`
                : undefined,
            outlineOffset: selected || invalid ? "1px" : undefined,
          }}
        >
          {children ??
            (renderContent ? (
              renderContent(card)
            ) : (
              <DefaultCardContent card={card} size={size} />
            ))}
        </div>
      )}
    </div>
  );
}

export type { ViewCard };
