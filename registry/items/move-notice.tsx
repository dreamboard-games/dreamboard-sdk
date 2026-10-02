import { Toaster, toast, type ToasterProps } from "sonner";
import "./tokens.css";
/** Where move notices appear. Render it once in the game. */
export function MoveNotices(props: ToasterProps) {
  return (
    <Toaster
      position="top-center"
      // Listed rather than stacked, so an earlier move stays readable.
      expand
      visibleToasts={3}
      duration={2500}
      gap={6}
      customAriaLabel="Moves"
      {...props}
    />
  );
}
/** A short notice of another player's move, marked with their seat colour. */
export function showMoveNotice(
  text: string,
  { seat }: { seat?: 1 | 2 | 3 | 4 | 5 | 6 } = {},
) {
  toast.custom(() => (
    <p className="db-move-notice" data-seat={seat}>
      {text}
    </p>
  ));
}
