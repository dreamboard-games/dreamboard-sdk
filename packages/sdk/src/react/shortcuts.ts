import { useLayoutEffect, useRef } from "react";
import type {
  ShortcutOptions,
  ShortcutTarget,
  ShortcutsController,
  RuntimeShortcutTarget,
  ShortcutActivity,
  ShortcutResult,
} from "../headless/features/shortcuts.js";
import type { CoreInstance } from "../headless/model.js";

/** Browser adapter input; the gesture session owns the single active target. */
export interface ShortcutSession {
  getActiveTarget(): RuntimeShortcutTarget | null;
  getShortcutActivity(): ShortcutActivity<unknown>;
}
function canHandle(event: KeyboardEvent) {
  const target = event.target;
  return (
    !event.defaultPrevented &&
    !event.repeat &&
    !event.isComposing &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !(
      target instanceof Element &&
      target.closest(
        "input:not([type='radio']), textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox']",
      )
    ) &&
    !Array.from(
      document.querySelectorAll(
        "[aria-modal='true'], dialog[open], [role='dialog'], [role='menu'], [role='listbox']",
      ),
    ).some(
      (surface) =>
        !surface.closest("[aria-hidden='true']") &&
        surface.checkVisibility({
          visibilityProperty: true,
          opacityProperty: true,
        }),
    )
  );
}
/** Installs only for a committed child beneath the bound GameProvider. */
export function useShortcutsAdapter<G>(
  game: CoreInstance<G>,
  controller: ShortcutsController<G>,
  session: ShortcutSession,
  options: ShortcutOptions<G>,
  onResult: (result: ShortcutResult | Error) => void,
) {
  const latest = useRef({ options, onResult });
  const registration = useRef<ReturnType<
    ShortcutsController<G>["register"]
  > | null>(null);
  useLayoutEffect(() => {
    latest.current = { options, onResult };
  });
  useLayoutEffect(() => {
    let mounted = true;
    const owned = controller.register(latest.current.options);
    registration.current = owned;
    let source = game.getOptions().source;
    let seat = game.snapshot?.me;
    let lifetime = 0;
    const unsubscribe = game.subscribe(() => {
      const nextSource = game.getOptions().source;
      const nextSeat = game.snapshot?.me;
      if (source === nextSource && seat === nextSeat) return;
      source = nextSource;
      seat = nextSeat;
      ++lifetime;
    });
    function keydown(event: KeyboardEvent) {
      if (!canHandle(event)) return;
      // Bound game identity boundary; session targets originate from its own controls.
      const started = lifetime;
      const active = () => mounted && lifetime === started;
      const pending = controller.handle(
        event.key,
        session.getActiveTarget() as ShortcutTarget<G> | null,
        session.getShortcutActivity() as ShortcutActivity<G>,
      );
      if (!pending) return;
      event.preventDefault();
      void pending.then(
        (result) => {
          if (active()) latest.current.onResult(result);
        },
        (cause: unknown) => {
          if (active())
            latest.current.onResult(
              cause instanceof Error ? cause : new Error(String(cause)),
            );
        },
      );
    }
    window.addEventListener("keydown", keydown);
    return () => {
      mounted = false;
      unsubscribe();
      window.removeEventListener("keydown", keydown);
      registration.current = null;
      owned.dispose();
    };
  }, [game, controller, session]);
  useLayoutEffect(() => {
    registration.current?.update(options);
  });
}
