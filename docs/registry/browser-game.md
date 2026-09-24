# browser-game

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/browser-game
```

Playwright locators over the public gameplay DOM attributes. Test-only source.

Test-only Playwright helper. Copied to test/helpers/browser-game.ts; use canonical data attributes, not a private action protocol.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

The helper returns Playwright locators for card, board target, submit and selected-seat controls using public DOM attributes. It issues no transport commands and imports no game reducer. Use it from actual game-owned browser tests.
