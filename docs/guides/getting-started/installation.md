# Installation

```sh
pnpm add @dreamboard-games/sdk
# React applications also install the optional renderer peer:
pnpm add react react-dom @tanstack/react-store@0.11.1
# Reducer authoring uses Zod:
pnpm add zod
```

Use the package root for instances, sources and features; `/react` for React;
`/reducer` for authoring and execution; `/testing` for browser-safe local scenario
tooling. Keep executable game imports out of the hosted UI entry. Start a real
local example with `pnpm ui dev --game hearts` from this repository.
