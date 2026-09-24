# React adapter and reference UI cutover

Status: follows the reviewed headless instance and source contracts.

Read the accepted constraints in 004-instance-review-notes.md. Bind React to the
typed instance through a thin maintained TanStack Store adapter. Provide the
typed hook factory, provider and Subscribe surface without importing executable
game definitions. Preserve feature-specific APIs and inferred input values in
the hook result. Methods observe current options; source replacement disposes
the old lifetime. Prove selector render isolation and controlled draft updates.
Do not wrap external-store writes in startTransition and promise animation.

Migrate both Hearts and Hex hosted UIs to type-only game imports and the instance
getters, handlers and props. Keep reducer execution in local dev/scenario sources
and separate that entry from installed hosted UI. Use the reviewed pure registry
source components, then add the minimum bound items in layer 006. No temporary
compatibility runtime exports: delete the old SDK React contexts, hooks, controls
and styled component public surface after callers move. If a temporary internal
tool caller remains, migrate it in the same cut or split the cut before deletion.

Independent inputs submit together; Hex bandit selection submits one committed
step at a time. Show saved selections separately from the unfinished local draft.
Keep cancel available for saved progress and reset for drafts. User actions must
exercise instance handlers, with native keyboard behavior and meaningful disabled
state. Preserve card target ambiguity and existing gameplay interactions.

Verification: checked React API and feature inference, selector render isolation,
controlled edits while a request is pending, source replacement/unmount cleanup,
both complete reference-game tests, and packed UI import closure proving no game
reducer or Node code reaches the hosted UI. Run pnpm check, then meaningful
desktop/keyboard/touch/accessibility browser proof with the registry cutover.

## React adapter receipt

The adapter binds game types and features without a source. Each mounted
`GameProvider` requires its own source, creates its instance after commit, and
disposes that lifetime on unmount. Strict Mode replay retains one live instance;
source replacement installs current options on that instance. `useGame(selector)`
and `Subscribe` use maintained TanStack `useSelector` with optional comparison.
React consumers install the optional `@tanstack/react-store` peer explicitly.

The integrated repository gate passed 800 SDK tests and both packed reference
games. Nine adapter tests cover selector isolation, controlled updates, source
replacement, abandoned render, Strict Mode cleanup, independent providers, and
coverage warnings. Compile-only proofs retain exact feature/source capability
types and require provider source. The export gate includes the actual `/react`
facade, and the all-facade installed smoke explicitly installs optional peers.
A fresh packed Vite browser consumer mounted under Strict Mode and replaced its
source with no page errors; the React adapter stays external to prevent a bundled
CommonJS React shim. Full-gate evidence: `/tmp/react-integrated-check-retry.log`;
packed browser evidence: `/tmp/react-peer-packed-browser.log`.

The game and registry migrations are reviewed separately; the old UI surface is
deleted only once their shared development and browser tooling has migrated.
