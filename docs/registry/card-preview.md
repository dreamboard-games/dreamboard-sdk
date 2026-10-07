# card-preview

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/card-preview
```

A centred card inspection opened with Alt/Option, a held finger, or an explicit action.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`CardPreview` takes `via` (`hover` for Alt/Option, `hold`, or `action`), the inspected card's `anchor` and its face as children. Alt/Option and hold previews close on release and do not take focus. Action inspection uses a Base UI dialog with a Close button, Escape dismissal, and focus return to the card. `--card-w-preview` is constrained to the viewport. Render only visible faces; concealed cards are never revealed by inspection.
