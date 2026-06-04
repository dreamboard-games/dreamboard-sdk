import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { useDrag } from "@use-gesture/react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./Drawer.js";
import { useChromeSuppression } from "./ChromeSuppressionContext.js";
import { ThemedButton } from "./ThemedButton.js";
import { useThemeCssVars } from "../theme/ThemeProvider.js";

export type HandDockMode = "inline" | "drawer" | "hidden";
export type HandDockPlacement =
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface HandDockToggleContext {
  label: string;
  count: number;
  open: boolean;
}

export interface HandDockPresentation {
  /**
   * `inline` preserves the normal shell hand strip. `drawer` collapses the
   * zone behind a viewport-safe toggle. `hidden` suppresses the zone entirely.
   */
  mode?: HandDockMode;
  /** Initial drawer state. Defaults to closed. */
  defaultOpen?: boolean;
  /** Where the drawer toggle/tray docks in the viewport. */
  placement?: HandDockPlacement;
  /** Toggle label override. Receives card count and open state. */
  toggleLabel?: ReactNode | ((context: HandDockToggleContext) => ReactNode);
  /** Width of the opened tray. */
  maxWidth?: CSSProperties["maxWidth"];
  /** Height of the opened tray before it scrolls. */
  maxHeight?: CSSProperties["maxHeight"];
  /** Extra style escape hatch for the outer dock. */
  style?: CSSProperties;
}

export interface HandDockProps {
  label: string;
  count: number;
  presentation?: HandDockPresentation;
  children: ReactNode;
}

const DEFAULT_MAX_WIDTH = "min(28rem, calc(100vw - 24px))";
const DEFAULT_MAX_HEIGHT = "min(65vh, calc(100vh - 96px))";

function placementStyle(placement: HandDockPlacement): CSSProperties {
  const base: CSSProperties = {
    position: "fixed",
    bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
    zIndex: 900,
  };
  switch (placement) {
    case "bottom-center":
      return {
        ...base,
        left: "50%",
        transform: "translateX(-50%)",
      };
    case "bottom-right":
      return {
        ...base,
        right: "calc(12px + env(safe-area-inset-right, 0px))",
      };
    case "bottom-left":
    default:
      return {
        ...base,
        left: "calc(12px + env(safe-area-inset-left, 0px))",
      };
  }
}

function triggerAlignment(
  placement: HandDockPlacement,
): CSSProperties["alignSelf"] {
  switch (placement) {
    case "bottom-center":
      return "center";
    case "bottom-right":
      return "flex-end";
    case "bottom-left":
    default:
      return "flex-start";
  }
}

function renderToggleLabel(
  label: string,
  count: number,
  open: boolean,
  override: HandDockPresentation["toggleLabel"],
) {
  if (typeof override === "function") return override({ label, count, open });
  if (override !== undefined) return override;
  return `${label} (${count})`;
}

export function HandDock({
  label,
  count,
  presentation,
  children,
}: HandDockProps) {
  const mode = presentation?.mode ?? "inline";
  const [open, setOpen] = useState(presentation?.defaultOpen ?? false);
  const contentId = useId();
  const themeCssVars = useThemeCssVars();
  useChromeSuppression(contentId, mode === "drawer" && open);

  // Swipe-up-to-open gesture on the dock handle strip.
  // The hook must be called unconditionally (React rules); we apply the
  // bindings only in drawer mode when the drawer is closed.
  const bindDrag = useDrag(
    ({ movement: [, my], velocity: [, vy], last }) => {
      // Require: upward movement > 40 px at > 0.3 px/ms velocity on release
      if (last && my < -40 && vy > 0.3) {
        setOpen(true);
      }
    },
    { axis: "y", filterTaps: true },
  );

  if (mode === "hidden") return null;
  if (mode === "inline") return <>{children}</>;

  const placement = presentation?.placement ?? "bottom-left";
  const toggleLabel = renderToggleLabel(
    label,
    count,
    open,
    presentation?.toggleLabel,
  );

  const fallbackContentStyle: CSSProperties = {
    maxHeight: presentation?.maxHeight ?? DEFAULT_MAX_HEIGHT,
    overflow: "auto",
    padding: 12,
    pointerEvents: "auto",
  };
  const triggerStyle: CSSProperties = {
    alignSelf: triggerAlignment(placement),
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.22)",
    pointerEvents: "auto",
    visibility: open ? "hidden" : "visible",
  };
  const canUsePortal = typeof document !== "undefined";
  const serverOpenContent =
    !canUsePortal && open ? (
      <div
        id={contentId}
        role="region"
        aria-label={label}
        style={fallbackContentStyle}
      >
        {children}
      </div>
    ) : null;

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="bottom">
      <div
        data-hand-dock={label}
        data-state={open ? "open" : "closed"}
        style={{
          ...placementStyle(placement),
          display: "flex",
          maxWidth: presentation?.maxWidth ?? DEFAULT_MAX_WIDTH,
          width: presentation?.maxWidth ?? DEFAULT_MAX_WIDTH,
          flexDirection: "column",
          alignItems: "stretch",
          gap: 8,
          pointerEvents: "none",
          ...presentation?.style,
        }}
      >
        {serverOpenContent}
        {/* Drag-handle strip — visible only when drawer is closed.
            Provides a touch target for the swipe-up-to-open gesture and a
            visual affordance matching the standard mobile bottom-sheet pattern. */}
        {!open && (
          <div
            {...bindDrag()}
            aria-hidden
            role="presentation"
            style={{
              alignSelf: triggerAlignment(placement),
              padding: "8px 16px 4px",
              cursor: "grab",
              touchAction: "none",
              pointerEvents: "auto",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: "rgba(15, 23, 42, 0.25)",
              }}
            />
          </div>
        )}
        <DrawerTrigger asChild>
          <ThemedButton
            type="button"
            variant="secondary"
            size="sm"
            data-state={open ? "open" : "closed"}
            aria-expanded={open}
            aria-controls={open ? contentId : undefined}
            className="rounded-full"
            style={triggerStyle}
          >
            {toggleLabel}
          </ThemedButton>
        </DrawerTrigger>
      </div>
      {canUsePortal ? (
        <DrawerContent
          id={contentId}
          aria-describedby={undefined}
          className="border-border bg-background/95 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/90"
          style={{
            ...themeCssVars,
            position: "fixed",
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 50,
            display: "flex",
            maxHeight: "80vh",
            flexDirection: "column",
            overflow: "hidden",
            borderTop: "1px solid var(--border, #cbd5e1)",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            background: "var(--background, rgba(255, 255, 255, 0.96))",
            color: "var(--foreground, #0f172a)",
            fontFamily: "var(--font-sans)",
            boxShadow: "0 -18px 48px rgba(15, 23, 42, 0.22)",
            backdropFilter: "blur(8px)",
          }}
        >
          <DrawerHeader
            className="border-border border-b px-4 pb-3 pt-3 text-left"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              borderBottom: "1px solid var(--border, #e2e8f0)",
              padding: "12px 16px",
              textAlign: "left",
            }}
          >
            <DrawerTitle
              className="text-base"
              style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.25 }}
            >
              {label}
            </DrawerTitle>
            <DrawerDescription>
              {count} card{count === 1 ? "" : "s"} available.
            </DrawerDescription>
          </DrawerHeader>
          <div
            role="region"
            aria-label={label}
            style={{
              maxHeight: presentation?.maxHeight ?? DEFAULT_MAX_HEIGHT,
              maxWidth: presentation?.maxWidth ?? DEFAULT_MAX_WIDTH,
              width: "100%",
              margin: "0 auto",
              overflow: "auto",
              padding:
                "12px 16px calc(16px + env(safe-area-inset-bottom, 0px))",
              boxSizing: "border-box",
            }}
            className="mx-auto w-full overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-3"
          >
            {children}
          </div>
        </DrawerContent>
      ) : null}
    </Drawer>
  );
}
