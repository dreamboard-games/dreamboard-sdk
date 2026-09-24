import { Hand, type HandProps } from "./hand";
export function HandDrawer({ label = "Hand", ...props }: HandProps) {
  return (
    <details className="db-hand-drawer" open>
      <summary>{label}</summary>
      <Hand {...props} label={label} />
    </details>
  );
}
