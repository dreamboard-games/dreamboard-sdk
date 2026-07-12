# River Guild scenario coverage

Every behavior scenario starts from normal seeded setup and replays only legal
accepted `claimCargo` commands. There are no base imports, state patches,
test-only setup profiles, authored scheduler fields, deck injection, or outcome
injection.

The matrix proves:

- a complete two-human six-round demo and solo win, draw, and loss;
- exact deck composition, independent shuffles, and replay identity;
- active-human actionability, exact river domains, printed-value scoring, and
  exact-position refill;
- claim-highest unique/tie, every claim-kind unique/tie/absent branch, and
  sweep-left;
- ordered reveal, resolution, refill, and round-advance events;
- one- and two-human cooperative standings; and
- privacy plus the absence of a fake rival player or game-authored request ID.

The four UI scenarios select setup, early, midgame, and terminal prefixes from
`scenarios/complete-game.scenario.ts`. They do not check in presentation state
or add checkpoint metadata to the behavior scenario.

`test/generated/**` is intentionally retained byte-for-byte for the Phase 07
coordinated deletion. It is excluded from TypeScript and has no runtime reader.
