# UI iteration loops

Storybook and the Workbench answer different questions:

| Surface   | Command                             | Purpose                                                    |
| --------- | ----------------------------------- | ---------------------------------------------------------- |
| Storybook | `pnpm ui storybook`                 | component pixels, layout, focus, motion, and accessibility |
| Workbench | `pnpm ui workbench --scenario <id>` | reducer-backed runtime behavior, semantics, and submission |

Storybook owns tracked visual baselines. Workbench tests replay fixtures
compiled from authored reducers and typed scenarios through the SDK runtime.
Workbench screenshots, traces, and video are ordinary failure artifacts, not a
second baseline collection.

## Presentation loop

Run:

```sh
pnpm ui storybook
```

Develop responsive layout, focus and hover states, accessible names, and motion
here. Intentionally accept changed visual baselines with:

```sh
pnpm ui snapshots update
```

Review every changed snapshot before committing it.

## Behavior loop

Run one authored scenario against the built SDK:

```sh
pnpm ui workbench --scenario hearts.dealt-hand.desktop
```

The command materializes the needed ignored fixture output automatically. It
uses a fixed build directory, atomic replacement, and the last good output when
a rematerialization fails.

For component HMR during local iteration, resolve SDK source explicitly:

```sh
pnpm ui workbench --scenario hearts.dealt-hand.desktop --source
```

The `--source` option applies only to the development server. Build and test
paths consume `dist`.

## Test selection

```sh
# Storybook checks, all browser-driver and keyboard tests, and two smoke scenarios
pnpm ui test

# One Workbench scenario only
pnpm ui test --scenario hearts.dealt-hand.desktop

# Normal lanes plus every authored Workbench scenario
pnpm ui test --all
```

The default smoke scenarios are:

- `hearts.dealt-hand.desktop`, covering multi-select, draft mutation, and
  submission;
- `roll-and-write-scorecard.mark-cell.mobile`, covering mobile activation.

Scenario selection is intentionally direct. Add a scenario id only when you
want that exact focused proof; use `--all` for the complete authored set.

Browser assertions resolve the semantic request, verify actuator identity,
perform the physical action, flush the fixture transport, and compare measured
projection, semantic, draft, and submission state. Touch-capable projects use
Playwright `tap()` and desktop projects use `click()`. The normal gate also runs
the entire browser-driver and keyboard directories, where pointer drag and
keyboard interaction are covered.

## Motion and accessibility

Motion is presentation, not reducer behavior. Gate animation through the theme
motion contract so reduced motion resolves to zero duration. Changing reduced
motion must never change projection, semantic, draft, or submission output.

Storybook visual tests cover deterministic animation states. Workbench tests
assert reduced motion, layout, Axe results, and runtime behavior directly.

## CI

Pull requests run:

```sh
pnpm ui test
```

The main branch runs:

```sh
pnpm ui test --all
```

Release packaging is browser-free and remains separate from this lane.
