# @dreamboard-games/sdk 0.3.0-alpha.1 — packaging hygiene

This release is a non-breaking packaging bugfix for plugin iframe installs.
It does not change the authored API, reducer ABI, generated workspace shape, or
published subpaths.

## Install-affecting changes

- `react`, `react-dom`, `framer-motion`, and `zod` are peer dependencies only.
  They remain dev dependencies of the SDK package so local builds and tests use
  the same peer stack.
- `react-dom` is now declared explicitly as a peer dependency because the UI and
  runtime primitives render through React DOM.
- The `zod` peer range is relaxed from the exact `4.4.3` pin to `^4.4.3`; the
  reducer wire format remains governed by the JSON schema fixtures, not a zod
  patch-level install.
- `tailwindcss` moved out of runtime dependencies. The published runtime still
  ships `@dreamboard-games/sdk/ui/plugin-styles.css`, compiled from the SDK
  source before packing.

## Guardrails

- `pnpm check` now runs `pnpm peer-hygiene:check`, and `pnpm pack:dry-run`
  checks the packed manifest and CSS asset. They fail if SDK peers are
  duplicated in runtime dependencies, if required peers disappear, if
  build-time tools leak into the published dependency set, or if the packed CSS
  still contains Tailwind source directives.
