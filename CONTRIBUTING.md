# Contributing

Run `pnpm dev` to see your change. Before opening a PR, run `pnpm typecheck`, `pnpm lint`, `pnpm format` and `pnpm test`. CI runs the same checks and a build.

- A new knot is only a `KnotDef` in `src/engine/knots/`, with no knot-specific engine code. `AGENTS.md` has the rules for authoring one.
- The bake fingerprint test fails if a change alters how a knot ties. If that's on purpose, say why in the PR.
- Performance changes: include before and after numbers.
- Look at visual changes in the browser. No test covers how it looks.
