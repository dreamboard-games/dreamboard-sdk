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

The copied Hand uses one gesture-session active card for pointer and keyboard
focus. A mouse target changes on physical movement, so card animation under a
parked pointer does not switch inspection or activation. Export `useActiveCard`
alongside the other card gesture hooks from the game's binding.

Readable cards stand upright on a common bottom edge. Nearby cards spread
horizontally, with a longer taper only when crowded spacing needs it to keep
cards ordered and exposed. Motion uses zero-bounce duration springs: the face
enters quickly, while horizontal travel and returning cards settle over 300ms.
Retargeting continues from the current position with zero initial velocity.
Narrow hands reserve visible strips for the immediately adjacent cards. Farther
cards may temporarily be clipped while a readable face is active; leaving the
face restores the ordinary fan within the same native scroll extent. Drag
pickup keeps the measured visible dimensions, enlarging only a small idle face.

The native scroller contains one fixed-size presentation plane with headroom
above the fan. Its negative margin keeps the logical hand height stable; empty
headroom lets clicks reach table controls underneath it. Animated faces do not
change scroll extent. Alt/Option, touch hold and the menu inspection scale the
original authored face to fit the viewport using its actual aspect ratio.
