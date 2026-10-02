# seat

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/seat
```

One player at the table: avatar, name, held cards, score, turn ring and last action. No SDK dependency.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`Seat` requires `playerId`, `name` and a `seat` number from 1 to 6, which picks the seat colour. Optional props:

- `active` draws a pulsing turn ring around the avatar and tells screen readers whose turn it is. With reduced motion the ring stays still.
- `you` marks the selected seat, in its label and beside the name.
- `cards` shows how many cards the player holds face down, as small backs and a number.
- `score` takes any node, such as `"12 pts"`.
- `lastAction` is a short line under the name, such as "Played the 7 of clubs". A new action fades in.
- `avatar` replaces the name's initials with an image or emoji.
- Children, such as the player's public cards, go below.

The seat is a labelled region marked `data-player`, so a [hand](hand.md) animates cards passed from that player out of their seat. Arrange the seats yourself, opponents across the top and your own beside your hand, for example. Override `--seat-color` on a `data-seat` element for your own player colours.
