# zone-actions

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/zone-actions
```

A clickable zone title with an accessible action popup. No SDK runtime or game
provider is required. Follow [registry installation](../../registry/README.md)
first; the installed source belongs to the game.

`ZoneActions` takes a `label`, authored controls as `children`, and an optional
`className` for title positioning. Put it directly inside an element marked
`data-zone-actions-root`. Hovering or keyboard-focusing the title, or opening its
popup, highlights that element. The popup moves focus into its controls and
returns it to the title when dismissed. The title has a 44px minimum height.

```tsx
import { Popover } from "@base-ui/react/popover";
import { Button } from "@/components/ui/button";
import { ZoneActions } from "@/components/dreamboard/zone-actions";

<div data-zone-actions-root>
  {cards}
  <ZoneActions label="Discard">
    <Popover.Close render={<Button onClick={shuffle} disabled={!canShuffle} />}>
      Shuffle
    </Popover.Close>
  </ZoneActions>
</div>;
```

Install `button` separately when using this example. `Popover.Close` composes with
an authored button to dismiss after selection; other children can keep the popup
open. Games own labels, availability, interaction bindings and menu contents.
Use existing SDK interaction props when an action changes game state.

Spread/Gather is local presentation state. The
[Storybook example](../../registry/stories/zone-actions.stories.tsx) owns that state
and offers the toggle when `spread || count > 1`, so Gather remains available with
one or zero cards. When using a `Pile` beneath the title, hide its duplicate caption
visually with `className="[&_figcaption]:sr-only"` to retain its accessible count.
The component does not reveal hidden cards or change authoritative card order.

Styles live in the components layer of the installed `zone-actions.css`; ordinary
utilities and application styles can customize them. Keep the title as a direct
child of the marked zone so highlighting does not spill into ancestor zones.
