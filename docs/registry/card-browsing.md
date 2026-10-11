# Card browsing

Installed automatically with `hand`, `card-row` and `card-control`. This shared copied component owns their Browse dialog and touch-preview positioning; the SDK continues to own gesture recognition and game actions.

A visible **Browse N cards** button opens the same cards in order, using the authored controls. Its space is reserved even when a collection is empty, so arrivals do not move a tucked hand's edge. Cards in the sheet keep inspection and actions, disable dragging, and close the sheet after an action. Multi-card selection keeps it open. Closing returns focus to Browse; changing seats closes the dialog.

Sliding across a hand or row chooses cards by their unchanged resting slots. `CardControl` draws the enlarged face in a portal, outside any clipping or transformed table containers. No gesture instructions are displayed.

## Placement policy

Floating UI supplies viewport collision detection, shifting and available-size measurements. The registry supplies the reading policy:

1. Reserve 40px to either side of the touch point, 32px above and 80px below it. These are conservative presentation defaults, not a measurement of the user's hand.
2. Use the visible viewport, safe-area insets and 16px outer margins.
3. Try a 240px-wide face above, below, then on the roomier side and the other side, preserving its aspect ratio. Prefer a full-size alternative before shrinking.
4. Retain the chosen placement and width while they fit. If they stop fitting, choose the largest available candidate, with the same order breaking ties.
5. Below 180px wide, hide the floating preview and leave Browse available. Never open a dialog automatically during a swipe.

Touch cancellation, release, lost focus and a seat change clear the transient preview. Viewport scrolling and resizing recalculate its position. The floating preview has no pointer events, so it cannot intercept gestures or change the underlying hit targets. Mouse and keyboard retain the existing hand focus and explicit inspection behavior.

`registry/scripts/card-browsing-proof.ts` exercises real touch input at the top, middle and bottom of portrait and landscape screens, checks finger clearance and stable source geometry, and covers crowded collections, dialog focus return and a short viewport that cannot fit a readable preview. Screenshots mark the actual test touch position with a small circle.
