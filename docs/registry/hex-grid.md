# hex-grid

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/hex-grid
```

Pure, composable hex grid presentation. No SDK dependency.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`HexGrid` takes a label and tiles with id, polygon points and center, plus optional fill/label. SVG children compose overlays. Geometry and adjacency must come from the board owner; the display component never invents topology.
