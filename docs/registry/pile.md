# pile

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/pile
```

A stack of cards with edges by depth, a count badge and an empty outline. No SDK dependency.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`Pile` takes `count`, `label` and the top card as children. Below the top card, one edge shows for every six cards, up to four, so a full deck looks thicker than a short one. A badge on the corner shows the count. An empty pile is a dashed outline the size of a card. The caption names the pile and tells screen readers how many cards it holds. Cards are sized with `--card-w-pile`. Add `data-zone` so cards drawn from the pile start there.
