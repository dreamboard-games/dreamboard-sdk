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

The copied Hand uses one gesture-session active card for pointer, finger and
keyboard focus. A mouse target changes on physical movement, so card animation
under a parked pointer does not switch inspection or activation. A finger
sliding along the hand raises the card resting under it, one strip's travel
per card however wide the raised face is; lifting there opens that card's
menu, sliding off chooses nothing, and turning upward picks the card up.
Export `useActiveCard` and `useCardRow` alongside the other card gesture hooks
from the game's binding.

Readable cards stand upright on a common bottom edge. Nearby cards spread
horizontally, with a longer taper only when crowded spacing needs it to keep
cards ordered and exposed. Motion uses one exponential ease-out: the face
rises 90% of the way in about 45ms, while horizontal travel and returning cards
are 90% home in about 300ms. Motion restarts a retargeted animation from the
current pose, and this curve continues from there at full speed, so sweeping
across the hand never stalls a card or overshoots. A card whose action menu is
open keeps its readable pose until the menu closes, so the menu stays where it
opened while the pointer or keyboard focus moves into it.
Narrow hands reserve visible strips for the immediately adjacent cards. Farther
cards may temporarily be clipped while a readable face is active; leaving the
face restores the ordinary fan. Drag pickup keeps the measured visible
dimensions, enlarging only a small idle face.

The fan always fits the hand and never scrolls. Once each covered card shows
less than 16 px, too thin to aim at, the whole hand becomes one button with the
card count. It opens a bottom sheet with every card at a readable size in hand
order: a card opens its menu as in the hand, choosing an action closes the
sheet so the table shows the rest of the move, and cards an action picks
several of toggle while the sheet stays open. Swipe down, Escape or Done
closes it.

The hand clips one fixed-size presentation plane with headroom above the fan.
Its negative margin keeps the logical hand height stable; empty headroom lets
clicks reach table controls underneath it. Alt/Option, touch hold and the menu
inspection scale the original authored face to fit the viewport using its
actual aspect ratio.
