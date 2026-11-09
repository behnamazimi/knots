# Knots Made Easy

React + TypeScript + three.js app that animates knot tying. No physics library. The rope is simulated, not keyframed: invisible "guide" pins pull points of the rope along authored paths and physics does the rest (sagging, friction, collisions, cinching). React Router (framework mode, `ssr: false`) prerenders one static page per knot; it is hosted on Cloudflare Pages.

## Start here: what are you changing?

All paths below are under `src/`.

| Task                                                   | Read first                                                                                           | Don't need         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------ |
| Add or tune a knot                                     | `engine/knots/types.ts`, `engine/knots/overhand.ts` (template), `engine/knots/index.ts`              | render, app        |
| Rope physics (stiffness, contact, friction, guides)    | `engine/sim/rope.ts`, `engine/sim/rope.test.ts`, "Gotchas" below                                     | render, app        |
| Ropes, props or other engine features                  | "Multi-rope layout" below, `engine/sim/rope.ts`, `engine/sim/bake.ts`, `engine/playback/timeline.ts` | ropeMesh internals |
| How rope looks (strands, ends, shading, props, lights) | `engine/render/ropeMesh.ts`, `engine/render/ropeMaterial.ts`, `engine/render/stage.ts`               | sim, app           |
| Camera, render loop, what is drawn                     | `engine/render/viewer.ts`, `engine/render/stage.ts`, `app/features/viewer/`                          | sim                |
| Twist along the rope / normals                         | `engine/sim/frames.ts`                                                                               | rest of sim        |
| Playback logic (play, seek, steps, loop, bake edge)    | `engine/playback/player.ts` + its test                                                               | sim, render        |
| Player UI, picker, tuner                               | the feature folder in `app/features/`, `app/screens/KnotScreen.tsx`                                  | sim, render        |
| Page titles, share previews, URLs, the domain          | `app/shared/site.ts`, `app/shared/meta.ts`, `app/routes/`                                            | engine             |
| Knot recorder (tie a knot with the mouse, get guides)  | `engine/record/recording.ts`, `engine/render/recorder.ts`, `app/features/recorder/`                  | sim internals      |
| Share videos of a knot (camera, captions, encoding)    | `../tools/film.ts` (camera, captions), `../tools/film.mjs` (driver), "Films" below                   | app                |

Run `pnpm test` after anything in `engine/`. Look at UI and rendering changes in the browser (`pnpm dev`), since no unit test covers how it looks; `pnpm test:e2e` checks the built site.

## Commands

- `pnpm dev` – dev server (`.claude/launch.json`: `dev` on 5173, `dev-react` on 5177)
- `pnpm test` – vitest: sim tests, player tests, the bake fingerprint of every knot (~30 s)
- `pnpm build` – route typegen, `tsc --noEmit`, then `react-router build` into `build/client` (prerendered pages + `404.html`)
- `pnpm typecheck`, `pnpm lint` (oxlint, including the import rules below), `pnpm format` (oxfmt)
- `pnpm test:e2e` – Playwright in `e2e/` against the production build served by `wrangler pages dev` on 5174
- `pnpm preview` – serve `build/client` the way Cloudflare Pages does (after `pnpm build`)
- `pnpm deploy:pages` / `pnpm deploy:pages:preview` – build and upload to Cloudflare Pages (production / a preview branch); needs `wrangler login` once. Not `pnpm deploy`: that name is a pnpm built-in.
- `pnpm thumbs [url]` – with a dev server running, shoot every knot's finished state to `public/og/<id>.jpg` (1200×630: the share image and the picker card). Rerun after adding a knot or changing how one ends; a test fails if an image is missing.
- `pnpm film [id… | --all]` – render knots as MP4s for sharing into `videos/` (git-ignored; real rope, scripted camera, step captions; frames drawn by `tools/film.ts`, encoded by macOS's own encoder; needs Google Chrome and macOS). `--cut=hands,cinch`, `--size=1080x1080`, `--speed`, `--hold`.
- `pnpm baked` – serve `tools/` for the top-view debugging page (see "Checking a change with one bake")

All of tests, typecheck, oxlint and oxfmt must pass before committing.

## Commits and PRs

- All changes go through a pull request into `main`; never push to `main` directly. Work on a branch, open a PR, and let CI pass (it runs the same checks plus a build) before merge. Don't commit or push unless the user asked you to.
- Subject: one imperative sentence in plain English, capitalised, no period, no `feat:`/`fix:` prefix, ideally under 72 characters ("Halve the cost of rebuilding the rope mesh"). The PR number `(#14)` is added by the squash merge; don't write it yourself.
- Body (optional): why, not what. Say so when a bake fingerprint hash changed on purpose, and give before/after numbers for performance changes.
- One subject per commit and per PR. Don't mix a refactor with a new knot or a physics change.
- Never hand-edit the "Tie the latest stargazer knots" commits' output (`.github/stargazer-rope-*.svg`); a workflow produces them.

## Architecture

```
src/engine/   framework-free: no React, no DOM framework, nothing from src/app
  knots/      KnotDef data, one file per knot; index.ts sets the menu order
  sim/        RopeSim (XPBD), bake (whole knot → frame chunks; firstFrame), worker, MaterialFrames
  playback/   Timeline (baked-frame store, sampling), Player (playback state store)
  render/     stage (renderer, lights, table, camera, OrbitControls, view reset), ropeMesh,
              ropeMaterial, KnotViewer (render loop: ticks the player, draws the ropes)
  record/     recording.ts: recorder presets, hand track → Guide, recording → KnotDef and code
  session.ts  createKnotSession: starts a knot's bake into a Player
src/app/      React Router app
  root.tsx, routes.ts, routes/   "/" (first knot), "/knots/:id", "/recorder", "*" (not found)
  screens/KnotScreen.tsx         composes the features for one knot's page
  features/<name>/               viewer, player, picker, tuner; each exports from its index.ts
  shared/                        site.ts (domain, URLs), meta.ts (title/OG tags), hooks, ui/ (icons, IconButton)
  styles/global.css              design tokens and base element styles; components use CSS modules
```

Dependency rules, enforced by oxlint (`.oxlintrc.json`):

- `src/engine` never imports React, React Router or `src/app`.
- A feature never imports another feature; screens and routes compose them.
- Outside a feature, import it through its `index.ts`, never its files.

React rules: the render loop and the bake stay outside React. UI reads the engine's stores with `useSyncExternalStore` (`Player.subscribe/getSnapshot`, `KnotViewer.onViewChange/isDefaultView`). The only effect hook is `useMountEffect` (`app/shared/hooks.ts`), for starting and stopping outside things (the viewer, a worker, a document listener). To start over (another knot, other physics), remount with a `key`: `KnotScreen` keys its session on the knot id and the physics.

## How it is wired

```
route /knots/:id → KnotScreen → Session (keyed by knot + physics)
   │  Player.forKnot(knot): plain data, so the prerendered page shows step 1 and the duration
   ▼
ViewerCanvas mounts → new KnotViewer(canvas) → start(viewer):
   createKnotSession(knot, player, physics) → Timeline ── posts KnotDef ──▶ sim/worker.ts → bake()
      Timeline fills frame 0 at once (firstFrame), chunks arrive from the worker → player.setReady
   viewer.show(session): KnotViewer's loop: player.tick(dt) → timeline.sample(time) → RopeMesh.update → render
PlayerBar reads the Player store; its buttons call Player actions
```

Frames are baked in a Web Worker while the user watches; playback waits at the edge of what is baked. Before scripts run, the prerendered page shows the whole layout and the knot's picture as a faded poster; the poster fades out once the viewer draws its first frame (the start pose, computed on the main thread), so the page is never empty and nothing shifts.

### Files

- `engine/knots/types.ts` – the data model: `KnotDef` (`ropes[]`, optional `props[]`, `guides[]`, `steps[]`, `duration`), `RopeDef` (length, radius, `start` polyline, optional `color`), `Prop` (capsule/cylinder), `Guide` (`rope?`, `at` = fraction along that rope, `grab` time, `path` keys, optional `compliance`/`force`).
- `engine/knots/overhand.ts` – a good template. `engine/knots/index.ts` lists knots in menu order.
- `engine/sim/rope.ts` – `RopeSim`: position-based Cosserat rod, small-step XPBD (24 substeps per frame). Per substep: guides, bend/twist, stretch/shear, then rounds of (tridiagonal direct length solve + self/rope-rope collision), then table and prop contact. Deterministic. Also `sampleHermite` (guide paths) and `particleCount`.
- `engine/sim/bake.ts` – runs a whole knot, emits chunks of frames/normals; `firstFrame` gives frame 0 alone. `engine/sim/frames.ts` – `MaterialFrames`: per-rope parallel-transported normals so rope twist stays with the material. `engine/sim/bake.fingerprint.test.ts` – hash of every knot's bake; update a hash only for an intended change.
- `engine/playback/timeline.ts` – main-thread frame store, `counts` per rope, `sample(time)`. `player.ts` – playback state and actions.
- `engine/render/ropeMesh.ts` – three-strand laid-rope geometry rebuilt around the centreline every frame, plus cut ends/sleeves. `ropeMaterial.ts` – rope material and textures. `stage.ts` – renderer, camera, lights, table, `createPropMesh`. `viewer.ts` – `KnotViewer`.
- `app/features/tuner/` – material playground: add `?tune` to any knot page for sliders over `DEFAULT_PHYSICS` (in `rope.ts`); letting go writes the values to the URL (`&bend=0.01&mass=2.2`), which re-bakes the knot.
- `/recorder` – the knot playground: click the rope to put a hand on it (it holds until let go); with time stopped, drag hands' dots to plan a move (W/S for height), then Play move takes them all there together. Each hand is recorded as a guide (`RopeSim.hands` are the live hands, `RopeSim.save/restore` back exact undo). Replay all re-runs the guides as the bake would; Copy code gives a `KnotDef` to tidy into `src/engine/knots/`. The state is kept in localStorage.
- `app/shared/site.ts` – `SITE_URL` (the custom domain; the only place it lives), `knotPath`, `knotImagePath`.
- `wrangler.toml`, `public/_headers` – Cloudflare Pages project and asset caching.

### Multi-rope layout (important when touching the sim)

All ropes live in one particle array and one segment array, one rope after another. Segment `j` joins particles `j` and `j+1` unless `end[j]` marks `j` as the last particle of its rope (a break). Stretch, bend/twist, the length solve, velocity smoothing and the collision `skip` rule must never cross a break. Baked frames hold all ropes back to back; `Timeline.counts[k]` gives each rope's slice, and `KnotViewer` gives each `RopeMesh` its slice via `subarray`. Radius, spacing and mass are per particle/segment.

Props are static: `solveProps` pushes particles out and applies friction, once per substep after the table. A particle exactly on a prop's core is skipped.

## Adding a knot

Data only: write a `KnotDef` in `src/engine/knots/`, add it to `engine/knots/index.ts`, then run `pnpm thumbs` for its picture and add its hash to the bake fingerprint test. Do not add knot-specific code to the engine. Guide `at` is a fraction along its rope; the table is at y = 0, ropes rest at y = radius; the camera looks from +z. Every knot in the list is run through `src/engine/knots/knots.test.ts`, which assumes **one rope** and a knot that ties and cinches; a multi-rope knot needs its own tests.

### Choreography: think in hands, not pins

Guides are hands. A natural move grabs one point and lets physics carry the rest; driving several points of the same stretch on their own paths makes them fight and the rope looks puppeted.

- **One hand per move.** To flip a curve over, grab one point on it (about its middle) and carry it; let the rest follow. Pins that only laid out a shape let go (end their path with a bare `{ t }`) before the next move starts.
- **Tie near the working end.** A long tail must be dragged and swung round, which causes waves, hooks and whipping. Use only as much tail as the tuck needs.
- **Lay rope straight.** If two pins hold less distance apart than the rope between them, the slack bows into a wave. Space targets by about the rope length between the pinned points.
- **The end leads.** When the end travels, keep it ahead of the rope behind it so it points where it is going, not trailing as a hook.
- **Lift low.** Clear the rope underneath by a little (centre about 3–4 radii up). Rope lifted high toward the camera is seen end-on and its strands read as noise.
- **Pull both ends evenly.** Final pull targets far enough apart to cinch (the cinch test), and centred on the knot so it does not slide (the "stays where it was tied" test).
- **Check what a stage looks like** in the browser at a few step times, not only the tests: tests catch topology and cinching, not awkward motion.

### Checking a change with one bake

`tools/knot-dump.test.ts` bakes one single-rope knot and prints numbers, so each guide change costs one bake (~20 s) instead of a test run or a sweep. It is skipped unless `KNOT` is set, so `pnpm test` ignores it.

```bash
KNOT=bowline TIMES=13.3,13.9 ATS=0.272,0.95,1 CROSS=13.9,18 npx vitest run tools/knot-dump.test.ts --disableConsoleIntercept
```

- One row per time in `TIMES` (default: the step times), giving the position of each point in `ATS` (fractions along the rope) as `at(x, height in radii, z)`. Compare it with the guide's target to see whether a hand keeps up, and with nearby strands to see where the rope really is: a held loop on soft rope can end up smaller than its pins.
- `cross t:` lists where the rope crosses itself in top view, for example `0.52 under 0.73`. An extra crossing means an extra wrap or curve; a missing one means a tuck missed its hole. It is a rough check and can miss crossings inside a tight knot.
- `stretch` is the worst link stretch (keep it under about 1.1); `closest` is the nearest approach of distant rope parts (under 2R means one passed through another).
- `tools/out/bake.json` (git-ignored) feeds `tools/baked.html`: run `pnpm baked` and open http://localhost:5178/baked.html (add `?zoom` for the middle of the table, `?box=x0,x1,z0,z1` for any area) for a top view with step ticks. With several ropes, pick a point on rope k with `ATS=k:0.5`. The report is also saved to `tools/out/metrics.txt`.

### Films for sharing

`pnpm film bowline` (or `--all`) writes `videos/<id>.mp4` (git-ignored, so the files stay out of the repo's history): 1920×1080 H.264, no audio, ~20 s, ready for X. Nothing is faked: the page `tools/film.html` + `film.ts` bakes the knot, then draws each frame on request with the real `RopeMesh` and `createStage`, so the film's clock is exact and the camera is a script, not a mouse.

- **Cuts:** `--cut=full` (default, the captioned tutorial, `<id>.mp4`), `--cut=hands` (`<id>-hands.mp4`, ~11 s at 1.8× with "No keyframes." and glowing dots where each guide holds the rope; for developers) and `--cut=cinch` (`<id>-cinch.mp4`, ~5–7 s close-up of the last pull; for everyone). `--cut=all` or a comma list renders several. Each cut re-bakes the knot.
- **Camera:** the `keys` array in `film.ts` (film time, azimuth°, elevation°, distance); a cardinal spline carries the camera through them, and the target drifts from the table's middle onto the knot's densest part of the finished rope (`knotCentre`).
- **Captions:** the step title and `n / total` come from `knot.steps`; the title top left and the address on the final hold are drawn on a 2D canvas over the frame (`overlay`).
- **Encoding:** `tools/encode-video.swift` (AVFoundation, built on first use into `tools/out/film/`), because there is no ffmpeg dependency. macOS and Google Chrome are needed (`--headless` falls back to software GL, which is slow). Options: `--size=1080x1080`, `--fps`, `--speed` (tying speed), `--hold` (seconds on the finished knot).
- Frames are JPEGs in a temporary folder that is deleted after encoding (`--keep` keeps them, to inspect one). The bitrate is 14 Mbit/s, which makes the longest knots about 35 MB; lower `AverageBitRate` in the Swift file for smaller files.

## Gotchas

- Physics constants in `rope.ts` were tuned with metrics sweeps; the rope material (`DEFAULT_PHYSICS`) is picked by eye in the `?tune` playground; change them deliberately and re-run the full tests. Every knot must keep baking bit-identically unless a change is intended (the fingerprint test checks).
- Rope-vs-prop and rope-vs-rope no-pass-through tests live in `src/engine/sim/rope.test.ts` (a test knot with two ropes and a pole). `RopeMesh` contact shading only considers its own rope.
- `RopeDef.start` must be about as long as `length` (the constructor throws otherwise).
- Collision is an O(n²) pair test with a block broad phase: fine for a few hundred particles, add a spatial hash for much more. A knot must bake faster than real time, or playback stalls at the bake edge.
