# `@dreamboard-games/sdk` UI Storybook stories

Public Storybook stories for SDK presentation components. Stories must:

- Render only controlled props or local React state. Do not mount
  `PluginRuntime`, runtime providers, or generated `UI.Root`.
- Exercise meaningful theme, viewport, and semantic-state combinations.
- Add a `play` function for interactive behavior that should be covered by
  Storybook's test runner.
- Use `@storybook/test` (`fn`, `userEvent`, `within`, `expect`) — never
  reach into Dreamboard reducer or workspace contracts.

Phase 4 will add long-press, swipe-up, and horizontal-browse arbitration to
`HandView`. The placeholder stories under `Hands/HandView` (`Long-press
preview`, `Swipe-up activation`, `Horizontal browse never activates`) are
flagged with `parameters.test.skip = true` until that pipeline ships.
