# results

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/results
```

The winner, every rank with ties, and a slot for Play again. No SDK dependency.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`Results` takes the same `standings` as [standings](standings.md), plus optional `title`, `caption` and `scoreLabel`. Its heading names the first-ranked players, "Ada wins" or "Ada and Lin tie", unless you pass a `title` such as "You win". The standings table follows, captioned "Final standings" by default, preserving the supplied order and tied ranks. Children, such as a Play again button, go below it. The section rises into place, or simply appears with reduced motion.
