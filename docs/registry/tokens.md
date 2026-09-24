# tokens

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/tokens
```

Dreamboard visual tokens and component styles.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

The stylesheet defines shared component tokens and scoped db-\* classes. Components import it where needed. Override CSS variables in the application; no SDK stylesheet or animation dependency is installed.
