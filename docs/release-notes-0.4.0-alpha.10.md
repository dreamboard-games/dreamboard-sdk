# @dreamboard-games/sdk 0.4.0-alpha.10 — agent-first reference games

This release makes typed scenarios the single authoring authority for all nine
reference games. Author-facing `reference-game.json` files use schema version 4
and discover behavior and UI scenarios by convention, while the expanded
release transport manifest intentionally remains schema version 3.

Typed scenarios may declare source-only named checkpoints. `inspect`, `explore`,
and `dev` resolve the same names, and inspect/explore JSON includes a sorted
checkpoint catalog. Every canonical complete-game scenario exposes `developed`
and `game-over`; compiled replay DTOs remain structural and schema-compatible.

Reference-game package verification now materializes once, and the selective
repository gate accepts repeatable game filters:

```sh
pnpm reference-games:check -- --game hex-network-trading
```

Focused Workbench and browser commands select the owning games before
materialization. Local focused runs use an ignored content-addressed cache and
watch selected sources while retaining the last good output after a failed
rebuild. Full CI and release determinism paths continue to compare two fresh
outputs.
