import { useLayoutEffect, useRef } from "react";
import type {
  ShortcutOptions,
  ShortcutTarget,
  ShortcutsController,
  RuntimeShortcutTarget,
} from "../headless/features/shortcuts.js";
import type { CoreInstance, SubmitResult } from "../headless/model.js";

/** Browser adapter input; the gesture session owns the single active target. */
export interface ShortcutSession {
  getActiveTarget(): RuntimeShortcutTarget | null;
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
        "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox']",
      )
    ) &&
    !document.querySelector(
      "[aria-modal='true'], dialog[open], [role='dialog'], [role='menu'], [role='listbox']",
    )
  );
}
/** Installs only for a committed child beneath the bound GameProvider. */
export function useShortcutsAdapter<G>(
  game: CoreInstance<G>,
  controller: ShortcutsController<G>,
  session: ShortcutSession,
  options: ShortcutOptions<G>,
  onResult: (result: SubmitResult | Error) => void,
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
    function keydown(event: KeyboardEvent) {
      if (!canHandle(event)) return;
      // Bound game identity boundary; session targets originate from its own controls.
      const source = game.getOptions().source;
      const seat = game.snapshot?.me;
      const active = () =>
        mounted &&
        game.getOptions().source === source &&
        game.snapshot?.me === seat;
      const pending = controller.handle(
        event.key,
        session.getActiveTarget() as ShortcutTarget<G> | null,
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
      window.removeEventListener("keydown", keydown);
      registration.current = null;
      owned.dispose();
    };
  }, [game, controller, session]);
  useLayoutEffect(() => {
    registration.current?.update(options);
  });
}
