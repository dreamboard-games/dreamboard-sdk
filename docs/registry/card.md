# card

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/card
```

Pure, composable card presentation. No SDK dependency.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`Card` accepts div props and `state: idle | eligible | selected | invalid`. `CardBack` labels a face-down card. Compose a Card inside a native button for actions; the visual face itself is not a button.
