/**
 * Plugin-internal toast notification system.
 *
 * `<ToastProvider>` exposes `<Toast.Actions>` for game-specific feedback
 * ("Resource gained", "Card discarded", "Tip: rotate the board with R", …).
 * It is intentionally NOT wired to the host notification stream:
 * `YOUR_TURN`, `PROMPT_OPENED` and `ACTION_REJECTED` events are owned
 * by the product host runtime's `<HostFeedbackToaster>` and must
 * not be mirrored from inside the plugin tree.
 */

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "../internal/ui/alert.js";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useTheme } from "../theme/ThemeProvider.js";
import { intentForVariant, type ButtonVariant } from "../theme/derive.js";
import type { Theme } from "../theme/tokens.js";
import { ThemedButton } from "./ThemedButton.js";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastNotification {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastNotification[];
  show: (message: string, type?: ToastType, duration?: number) => void;
  dismiss: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export type ToastActionsValue = ToastContextValue;

export interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const show = useCallback(
    (message: string, type: ToastType = "info", duration = 3000) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const toast: ToastNotification = { id, type, message, duration };

      setToasts((prev) => {
        // Dedup by `(type, message)` so a fast burst of identical
        // toasts collapses to one visible toast instead of stacking
        // and producing the flicker effect (toast-1 dismisses while
        // toast-2 mounts → user sees a flash). Keep the existing
        // entry untouched so its dismiss timer continues.
        if (
          prev.some((item) => item.type === type && item.message === message)
        ) {
          return prev;
        }
        return [...prev, toast];
      });

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (message: string, duration?: number) => show(message, "success", duration),
    [show],
  );
  const error = useCallback(
    (message: string, duration?: number) => show(message, "error", duration),
    [show],
  );
  const info = useCallback(
    (message: string, duration?: number) => show(message, "info", duration),
    [show],
  );
  const warning = useCallback(
    (message: string, duration?: number) => show(message, "warning", duration),
    [show],
  );

  return (
    <ToastContext.Provider
      value={{ toasts, show, dismiss, success, error, info, warning }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export interface ToastActionsProps {
  children: (actions: ToastActionsValue) => ReactNode;
}

export function ToastActions({ children }: ToastActionsProps) {
  return <>{children(useToast())}</>;
}

export const Toast = {
  Actions: ToastActions,
} as const;

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

const TOAST_ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
} as const satisfies Record<ToastType, unknown>;

const TOAST_VARIANT: Record<
  ToastType,
  Exclude<ButtonVariant, "ghost" | "secondary">
> = {
  success: "success",
  error: "danger",
  info: "info",
  warning: "warning",
};

function toastSurfaceStyle(theme: Theme, type: ToastType): React.CSSProperties {
  const intent = intentForVariant(theme, TOAST_VARIANT[type]);
  return {
    minWidth: 280,
    maxWidth: 400,
    display: "flex",
    alignItems: "flex-start",
    gap: theme.space[3],
    padding: theme.space[4],
    background: intent.soft,
    color: intent.onSoft,
    border: `2px solid ${intent.border}`,
    borderRadius: theme.radius.lg,
    boxShadow: theme.elevation.lifted,
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    fontFamily: theme.typography.fontFamily.body,
  };
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}) {
  const theme = useTheme();
  const reducedMotion = theme.motion.reducedMotion === "true";
  const Icon = TOAST_ICONS[toast.type];
  const intent = intentForVariant(theme, TOAST_VARIANT[toast.type]);
  const surfaceStyle = toastSurfaceStyle(theme, toast.type);

  return (
    <motion.div
      style={{ pointerEvents: "auto" }}
      initial={
        reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.9 }
      }
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <Alert
        variant={toast.type === "error" ? "destructive" : "default"}
        style={surfaceStyle}
      >
        <Icon
          size={20}
          style={{
            marginTop: 2,
            flexShrink: 0,
            color: intent.solid,
          }}
          aria-hidden="true"
        />

        <AlertDescription
          style={{
            flex: 1,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            lineHeight: theme.typography.lineHeight.relaxed,
            color: intent.onSoft,
          }}
        >
          {toast.message}
        </AlertDescription>

        <ThemedButton
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(toast.id)}
          style={{
            height: 28,
            width: 28,
            flexShrink: 0,
            borderRadius: theme.radius.pill,
            color: intent.onSoft,
          }}
          aria-label="Close notification"
        >
          <X size={16} aria-hidden="true" />
        </ThemedButton>
      </Alert>
    </motion.div>
  );
}
