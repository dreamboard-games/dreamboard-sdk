# playing-card

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/playing-card
```

Pure, composable playing card presentation. No SDK dependency.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`PlayingCard` requires `rank` and `suit` (hearts, diamonds, clubs or spades), plus Card props. Its accessible name describes rank and suit; visual suit glyphs are hidden from assistive technology.
