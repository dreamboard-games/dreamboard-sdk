# UI iteration loops

```sh
pnpm ui dev --game hearts
pnpm ui storybook
pnpm ui test --game hearts
```

Use a real local/scenario source for gameplay. The dev URL selects scenario, at
checkpoint and as player ID. Storybook covers pure components and every named
scenario checkpoint. `pnpm ui test` additionally proves pure and bound shadcn
installation and both desktop/touch browser suites.

Hosted UI modules contain no executable game imports. Local checkpoints contain
private state, so they belong only in developer tooling. Browser tests click
actual controls and inspect canonical selected-seat frames; old Workbench tapes,
digests and fixture compilation have been removed.
