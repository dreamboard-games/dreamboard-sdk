# Mobile hands and cards

```tsx
import { HandDrawer } from "@/components/dreamboard/hand-drawer";
export function HandPanel() {
  return <HandDrawer zoneId="hand" label="Your hand" />;
}
```

Use the actual projected zone ID in your game. The copied Hand/HandDrawer items
compose native buttons and headless card props; hidden cards render backs. The
native drawer works by keyboard and touch. Keep selection attributes, disabled
state and an accessible card label. Ordering may use visible card data only.

Hearts provides the real ranked-suit hand example. BoardTargets uses invisible
enabled touch areas without changing visible topology. Optional transitions and
animation are application-owned, not an SDK requirement.
