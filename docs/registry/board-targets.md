# board-targets

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/board-targets
```

Workspace-bound headless UI; copied source owned by the game.

Local development helper; do not import executable game code in the hosted entry.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`BoardTargets` requires boardId and supports hexSize, label and className. renderSpace/renderEdge/renderVertex render game artwork; spaceProps/edgeProps/vertexProps compose presentation. Enabled invisible hit areas preserve visible geometry, keyboard buttons support Enter/Space, and non-passive wheel handling uses SVG-space coordinates. The board and panZoom features must be enabled in @game.
