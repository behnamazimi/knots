# Contributing

Run `pnpm dev` to see your change. Before opening a PR, run `pnpm typecheck`, `pnpm lint`, `pnpm format` and `pnpm test`. CI runs the same checks and a build.

- A new knot is only a `KnotDef` in `src/engine/knots/`, with no knot-specific engine code. `AGENTS.md` has the rules for authoring one.
- The bake fingerprint test fails if a change alters how a knot ties. If that's on purpose, say why in the PR.
- Performance changes: include before and after numbers.
- Look at visual changes in the browser. No test covers how it looks.

## Using an AI tool

Welcome. Point it at `AGENTS.md` first (Claude Code reads it through `CLAUDE.md`; most other tools read it directly; Copilot is pointed to it by `.github/copilot-instructions.md`). You still own the PR: read the diff, run the four checks above, and look at motion changes in the browser, since tests can't tell if a knot looks wrong. Keep PRs small and on one subject. Don't update a bake fingerprint hash just to make a test pass.
