# card-preview

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/card-preview
```

An enlarged inspected card: beside it on hover, centred over the table on hold. No SDK dependency.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`CardPreview` takes `via` (`useCardGesture(...).inspecting`), the inspected card's `anchor` element and the enlarged card as children, which size themselves with `--card-w-preview`. A resting mouse sees it beside the card through a Base UI preview card, without moving the layout. A held finger sees it centred over a dimmed table, with a short vibration where the browser supports it; releasing closes it. Neither takes focus, and the card's own label already names it. Render it only while the card is inspected.
