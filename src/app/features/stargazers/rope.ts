import { KNOT_KINDS, type KnotKind, LEAD, jitter, knotFor, ropeLayout } from "./layout";

/** One entry of GitHub's stargazers API (`Accept: application/vnd.github.star+json`). */
export type Star = {
  starred_at: string;
  user: { login: string; id: number; avatar_url: string; html_url: string };
};

/** How many stars were given by `time` (stars sorted by date). A binary search: it runs on every render. */
export const countAt = (stars: readonly Star[], time: number) => {
  let [lo, hi] = [0, stars.length];
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (Date.parse(stars[mid].starred_at) <= time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

/** The band the rope may use, in canvas px (below the intro panel, above the timeline bar). */
export type Band = { top: number; bottom: number };

// Pictures of the real rope, each finished knot and the rope's end, made by
// tools/stargazer-sprites.mjs at PX pixels per rope diameter; the end sits TIP diameters into
// its picture. Drawing them is far cheaper than building the 3D rope.
const PX = 32;
const TIP = 5;
const image = (src: string) => Object.assign(new Image(), { src });
const picture = (name: string) => `/stargazers/${name}.png`;
/** Every picture the rope draws, so the page can start loading them before the rope starts. */
export const PICTURES = ["rope", "tip", ...KNOT_KINDS.map((k) => k.id)].map(picture);
const AVATAR = 2.4; // avatar radius, in rope diameters: bigger than a knot, so people come first
const SPARE = 7; // loop size in the loose pile of rope left for new stars, in rope diameters
const ACCENT = "#b9522c";
const POP = 420; // ms for a new knot to cinch tight and its avatar to pop in
const LAYING = 24; // rope still settling behind its paying-out end, in rope diameters
const REVEAL = 100; // rope still to pay out (the slow end of a replay) when the pile starts sliding into view, in rope diameters
const MORE = 90; // the most extra rope the pile shows while stars are still to come, in rope diameters
const PAY = 0.012; // per ms: how briskly the rope's end pays out to where the knots need it
const CALM =
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const PULSE = 1800; // ms of rings round a found knot
/** Frame-rate-independent easing: the share of the way to close in `dt` ms, `rate` per 60 Hz frame. */
const ease = (rate: number, dt: number) => 1 - (1 - rate) ** (dt / (1000 / 60));
/** Overshoots a little and settles, like a knot snapping tight. */
const popOut = (u: number) => 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2;

/**
 * The stars as one long rope wandering across the page, oldest first: each star is a small
 * overhand knot with the stargazer's avatar tied beside it. Knots crowd together in a burst of
 * stars and spread apart in a lull (`gapFor`); past the newest star a loose pile of spare rope
 * waits for the next ones. It opens on the newest stars and swipes (or wheels) back through the older ones.
 *
 * It only redraws when something moved or changed, so an idle page costs nothing. Runs its own
 * loop until `dispose`.
 */
export class StarRope {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private t = 7; // rope diameter on screen, px
  private y0 = 0; // the middle of the rope's wander
  private sway = 0; // how far it wanders up and down
  private stars: Star[] = [];
  private loaded = false; // no rope until the feed arrives, then at least the bare rope and spare
  private times: number[] = [];
  private shown = 0; // stars tied so far
  private reach = 0; // where the drawn rope ends, in diameters: it pays out after the layout's end
  private reachV = 0; // diameters per ms
  private payTo: number | null = null; // a replay's own rope end, in diameters, so it pays out evenly
  private laid = false; // whether the first stars have been laid down yet
  private fullEnd = 0; // where the rope ends once every star is tied, in diameters
  private tied = 0; // knots the paid-out rope has reached, so drawn
  private layoutCache: ReturnType<typeof ropeLayout> = { knots: [], end: 0 };
  private born = new Map<number, number>(); // when each knot was tied, for its pop-in
  private faces = new Map<number, { img: HTMLImageElement; cut: HTMLCanvasElement | null }>();
  private spots: { i: number; x: number; y: number }[] = []; // avatars drawn last frame, for hover
  private hovered = -1;
  private slot: { x: number; y: number } | null = null; // the empty spot for the next star's avatar
  private hoverGrow = 0; // 0 → 1 as the hovered avatar grows
  private found = -1; // the star someone searched for: centred and marked with its number
  private foundAt = 0;
  private target: number | null = null; // scroll position to glide to
  private scroll = 0; // rope position (px along it) at the screen's left edge
  private velocity = 0; // px per ms, after a swipe
  private lastLead = Number.NaN; // the follow target last frame, so the camera moves with it instead of trailing
  private follow = true; // keep the newest stars and the spare rope in view as stars arrive
  private drag: { x: number; scroll: number; moved: number; last: number; at: number } | null =
    null;
  private strip: HTMLCanvasElement | null = null; // the rope picture twice over, so slices never wrap
  private knots = Object.fromEntries(KNOT_KINDS.map((k) => [k.id, image(picture(k.id))])) as Record<
    KnotKind["id"],
    HTMLImageElement
  >;
  private kinds: KnotKind[] = [];
  private tip = image(picture("tip"));
  private dirty = true; // something changed: draw the next frame
  private last = 0;
  private frame = 0;
  private resize = new ResizeObserver(() => this.layout());
  private listeners: [string, EventListener][] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private band: () => Band,
  ) {
    this.ctx = canvas.getContext("2d")!;
    const rope = image(picture("rope"));
    rope.onload = () => {
      this.strip = document.createElement("canvas");
      this.strip.width = rope.width * 2;
      this.strip.height = rope.height;
      const c = this.strip.getContext("2d")!;
      c.drawImage(rope, 0, 0);
      c.drawImage(rope, rope.width, 0);
      this.dirty = true;
    };
    for (const img of [...Object.values(this.knots), this.tip])
      img.onload = () => (this.dirty = true);

    this.on("pointerdown", (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      this.drag = { x: e.clientX, scroll: this.scroll, moved: 0, last: e.clientX, at: e.timeStamp };
      this.velocity = 0;
    });
    this.on("pointermove", (e: PointerEvent) => {
      const d = this.drag;
      if (!d) return;
      d.moved = Math.max(d.moved, Math.abs(e.clientX - d.x));
      // A smoothed release speed, so a flick carries on at the speed it was going.
      const v = (d.last - e.clientX) / Math.max(e.timeStamp - d.at, 1);
      this.velocity = this.velocity * 0.6 + v * 0.4;
      [d.last, d.at] = [e.clientX, e.timeStamp];
      this.scroll = d.scroll - (e.clientX - d.x);
      if (d.moved > 4) [this.follow, this.target] = [false, null];
      this.dirty = true;
    });
    this.on("pointerup", (e: PointerEvent) => {
      if (this.drag && (this.drag.moved < 5 || e.timeStamp - this.drag.at > 80)) this.velocity = 0;
      // Cleared after the click that follows, so the click can tell a swipe from a tap.
      setTimeout(() => (this.drag = null));
    });
    this.on("wheel", (e: WheelEvent) => {
      e.preventDefault();
      this.scroll += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      this.velocity = 0;
      [this.follow, this.target] = [false, null];
      this.dirty = true;
    });
    this.resize.observe(canvas);
    const loop = (now: number) => {
      const dt = Math.min(now - (this.last || now), 64);
      this.last = now;
      if (this.step(now, dt) || this.dirty) {
        this.dirty = false;
        this.draw(now);
      }
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }

  private on<E extends Event>(type: string, fn: (e: E) => void) {
    this.canvas.addEventListener(type, fn as EventListener, { passive: false });
    this.listeners.push([type, fn as EventListener]);
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.resize.disconnect();
    for (const [type, fn] of this.listeners) this.canvas.removeEventListener(type, fn);
  }

  /** Whether the press that just ended was a swipe rather than a tap. */
  get swiped() {
    return (this.drag?.moved ?? 0) >= 5;
  }

  setStars(stars: Star[]) {
    this.stars = stars;
    this.kinds = stars.map((s) => knotFor(s.user.id));
    this.loaded = true;
    this.times = stars.map((s) => Date.parse(s.starred_at));
    this.fullEnd = ropeLayout(this.times, stars.length).end;
    this.relayout();
  }

  /**
   * Show the first `n` stars: the rope grows knot by knot, each cinching tight, and the view
   * follows. A replay also passes how far along the rope (diameters) it has got, so the rope pays
   * out smoothly between knots instead of a knot's gap at a time. `now` ties them all at once,
   * with no paying out.
   */
  setCount(n: number, along?: number, now = false) {
    this.payTo = along === undefined ? null : along + LEAD;
    this.dirty = true;
    if (n !== this.shown) {
      this.tied = Math.min(this.tied, n); // going back: those knots untie; new ones tie as the rope reaches them
      this.follow = true;
      this.shown = n;
      this.relayout();
    } else if (!now) return;
    if (!this.laid || now) {
      // The first stars shown are already on the rope when the page opens: no paying out to them.
      [this.laid, this.reach, this.reachV, this.tied] = [
        true,
        this.payTo ?? this.layoutCache.end,
        0,
        n,
      ];
    }
  }

  /** Whether star `i`'s knot is on the rope now: shown, and the paying-out rope has reached it. */
  isTied(i: number) {
    return i < this.tied;
  }

  /** Glide to star `i` (it must be shown), centre it and mark it with its knot number. */
  find(i: number) {
    const { knots } = this.layoutCache;
    if (i < 0 || i >= knots.length) return;
    this.found = i;
    this.foundAt = performance.now();
    this.follow = false;
    this.velocity = 0;
    this.target = knots[i] * this.t - this.w / 2;
    // From far away, cut to a screen or so short of it and glide the rest: a long glide is a blur
    // that takes seconds and loads every avatar it passes.
    const far = this.target - this.scroll;
    if (!CALM && Math.abs(far) > this.w * 3)
      this.scroll = this.target - Math.sign(far) * this.w * 1.5;
  }

  /** The star whose avatar is under a point (canvas px), or null. */
  pick(mx: number, my: number) {
    let best = (this.t * AVATAR + 3) ** 2;
    let hit = -1;
    for (const s of this.spots) {
      const d = (s.x - mx) ** 2 + (s.y - my) ** 2;
      if (d < best) [best, hit] = [d, s.i];
    }
    if (hit !== this.hovered) [this.hovered, this.hoverGrow, this.dirty] = [hit, 0, true];
    return hit === -1 ? null : this.stars[hit];
  }

  /** Whether a point (canvas px) is on the empty spot waiting for the next star. */
  overSlot(mx: number, my: number) {
    const s = this.slot;
    return !!s && (s.x - mx) ** 2 + (s.y - my) ** 2 < (this.t * AVATAR + 3) ** 2;
  }

  private relayout() {
    this.layoutCache = ropeLayout(this.times, this.shown);
    this.dirty = true;
  }

  private layout() {
    this.dpr = devicePixelRatio || 1;
    if (!this.w) this.scroll = -this.canvas.clientWidth / 2; // first size: the rope starts mid-screen
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.t = this.w < 600 ? 6 : 7;
    this.faces.forEach((f) => (f.cut = null)); // re-cut at the new size
    this.fit();
    this.dirty = true;
  }

  /** Fit the rope's wander to the band, which changes when the intro panel grows. */
  private fit() {
    const { top, bottom } = this.band();
    const y0 = (top + bottom) / 2;
    // Room above and below for a knot, its tie and its avatar.
    const sway = Math.max(0, (bottom - top) / 2 - this.t * (AVATAR * 2 + 2.5));
    if (y0 !== this.y0 || sway !== this.sway) [this.y0, this.sway, this.dirty] = [y0, sway, true];
  }

  /** Moves the view on by `dt` ms; returns whether anything is still moving. */
  private step(now: number, dt: number) {
    this.fit();
    const before = this.scroll;
    // The rope's end follows the layout on a critically damped spring, so it pays out and draws
    // back smoothly however the layout jumps; knots tie as it reaches them.
    const { knots } = this.layoutCache;
    const goal = this.payTo ?? this.layoutCache.end;
    if (CALM) [this.reach, this.reachV] = [goal, 0];
    for (let left = dt; left > 0; left -= 16) {
      const h = Math.min(left, 16);
      this.reachV += (PAY * PAY * (goal - this.reach) - 2 * PAY * this.reachV) * h;
      this.reach += this.reachV * h;
    }
    const paying = Math.abs(goal - this.reach) > 0.01 || Math.abs(this.reachV) > 1e-4;
    if (!paying) [this.reach, this.reachV] = [goal, 0];
    while (this.tied < Math.min(this.shown, knots.length) && knots[this.tied] <= this.reach - 2)
      this.born.set(this.tied++, now);
    const end = this.reach * this.t;
    // A rope shorter than the screen sits centred; a longer one can swipe its start to mid-screen.
    const min = -this.w / 2;
    const over = end + SPARE * 4.4 * this.t - this.w;
    const max = over > 0 ? over : over / 2;
    // Following a replay, the pile waits just off the right edge and slides into view over the
    // last few ties, as the rope still to come runs out.
    const u = Math.min(Math.max(this.fullEnd - this.reach, 0) / REVEAL, 1);
    const lead = Math.max(max - u * u * (3 - 2 * u) * SPARE * 6.4 * this.t, min);
    if (this.target !== null) {
      const goal = Math.min(Math.max(this.target, min), max);
      this.scroll = CALM ? goal : this.scroll + (goal - this.scroll) * ease(0.1, dt);
    } else if (this.follow) {
      // Carry the view along with the paying-out rope, then close what's left, so it doesn't trail.
      this.scroll += lead - this.lastLead || 0;
      this.scroll += (lead - this.scroll) * ease(0.12, dt);
    } else if (!this.drag) {
      this.scroll += this.velocity * dt;
      this.velocity *= Math.exp(-dt / 325); // a flick glides out over about a second
      if (Math.abs(this.velocity) < 0.01) this.velocity = 0;
      if (this.scroll < min) this.scroll += (min - this.scroll) * ease(0.2, dt);
      if (this.scroll > max) this.scroll += (max - this.scroll) * ease(0.2, dt);
    }
    this.lastLead = lead;
    if (Math.abs(this.scroll - before) < 0.05) this.scroll = before;
    let moving = this.scroll !== before || paying;
    if (this.hovered !== -1 && this.hoverGrow < 1) {
      this.hoverGrow = Math.min(1, this.hoverGrow + dt / 160);
      moving = true;
    }
    for (const [i, at] of this.born) {
      if (now - at < POP) moving = true;
      else this.born.delete(i);
    }
    return moving || (this.found !== -1 && now - this.foundAt < PULSE);
  }

  /**
   * The rope's wander: a few slow waves of different lengths, so it never repeats or reads as a
   * pattern. It lies still.
   */
  private wander(s: number) {
    const t = this.t;
    // The last stretch before the end is still being laid: it runs level into the pile and
    // settles into its waves as more rope pays out, instead of the end whipping up and down them.
    const u = Math.min(Math.max((this.reach * t - s) / (LAYING * t), 0), 1);
    return (
      this.y0 +
      this.sway *
        u *
        u *
        (3 - 2 * u) *
        (0.5 * Math.sin(s / (47 * t) + 1.3) +
          0.32 * Math.sin(s / (19 * t) + 4.1) +
          0.18 * Math.sin(s / (8.3 * t) + 2.2))
    );
  }

  /** Screen point and angle of the rope `s` px along it. */
  private point(s: number): [number, number, number] {
    const y = this.wander(s);
    return [s - this.scroll, y, Math.atan(this.wander(s + 1) - y)];
  }

  /** Star `i`'s avatar cut into a circle once, at `r` px, so drawing it is one plain copy. */
  private face(i: number, r: number) {
    let f = this.faces.get(i);
    if (!f) {
      const img = image(`${this.stars[i].user.avatar_url}&s=96`);
      f = { img, cut: null };
      img.onload = () => (this.dirty = true);
      this.faces.set(i, f);
    }
    if (!f.cut && f.img.complete && f.img.naturalWidth) {
      const size = Math.ceil(r * 2 * this.dpr * 1.6); // room for the hover and found sizes
      const cut = document.createElement("canvas");
      cut.width = cut.height = size;
      const c = cut.getContext("2d")!;
      c.beginPath();
      c.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      c.clip();
      c.drawImage(f.img, 0, 0, size, size);
      f.cut = cut;
    }
    return f.cut;
  }

  private draw(now: number) {
    const { ctx, t } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    if (!this.loaded) return;
    const { knots } = this.layoutCache;
    const end = this.reach * t;
    const strip = this.strip;
    const from = Math.max(this.scroll - t * 6, 0);
    const to = Math.min(this.scroll + this.w + t * 6, end);

    /** One slice of the rope picture from (x0, y0) to (x1, y1), `s` px into its pattern. */
    const lay = (x0: number, y0: number, x1: number, y1: number, s: number) => {
      if (!strip) return;
      if (Math.max(x0, x1) < -t * 2 || Math.min(x0, x1) > this.w + t * 2) return;
      const l = Math.hypot(x1 - x0, y1 - y0);
      const scale = PX / t;
      const a = Math.atan2(y1 - y0, x1 - x0);
      const [c, sn] = [Math.cos(a), Math.sin(a)];
      ctx.setTransform(
        c * this.dpr,
        sn * this.dpr,
        -sn * this.dpr,
        c * this.dpr,
        x0 * this.dpr,
        y0 * this.dpr,
      );
      ctx.drawImage(
        strip,
        (s * scale) % (strip.width / 2),
        0,
        l * scale,
        strip.height,
        0,
        -t,
        l + 0.8,
        2 * t,
      );
    };
    const reset = () => ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // The rope.
    for (let s = from; s < to; s += t * 2) {
      const [x0, y0] = this.point(s);
      const [x1, y1] = this.point(Math.min(s + t * 2, to));
      lay(x0, y0, x1, y1, s);
    }
    // Spare rope dropped in a loose pile past the newest knot: uneven loops that wander and
    // cross, as rope lands when it's let fall. While stars are still to come it holds more rope,
    // and it unwinds loop by loop as rope pays out: where the rope leaves it travels round the
    // loops, which otherwise lie still, and pulling tugs the loops nearest that point.
    const [ex, ey, ea] = this.point(end);
    const R = SPARE * t;
    // The pile's top meets the rope's height, so the rope runs straight into it.
    const [px, py] = [ex + R * 0.9, ey + R * 0.8];
    const loop = (a: number): [number, number] => {
      const r = R * (1 + 0.22 * Math.sin(1.3 * a + 0.7) + 0.12 * Math.sin(2.9 * a + 2.1));
      const cx = px + t * 2.2 * Math.sin(0.45 * a + 1.1);
      const cy = py + t * 1.6 * Math.cos(0.6 * a + 0.4);
      return [cx - r * Math.cos(a), cy - r * 0.8 * Math.sin(a)];
    };
    const START = Math.PI / 2; // the top of the first loop, heading right like the rope coming in
    const STEP = 0.1;
    const toCome = Math.max(this.fullEnd - this.reach, 0); // diameters still to pay out
    const a0 = START - Math.min(toCome, MORE) / SPARE; // where the rope leaves the pile
    const a1 = START + Math.PI * 2 * 4.6;
    const [ox, oy] = loop(a0);
    const pull = Math.hypot(ex - ox, ey - oy) || 1;
    const tug = Math.min(Math.abs(this.reachV) / 0.3, 1) * t * 1.8;
    // Angles on a fixed grid (plus the exit itself), so the loops' outline doesn't shimmer.
    const angles = [a0];
    for (let k = Math.floor((a0 - START) / STEP) + 1; START + k * STEP <= a1; k++)
      angles.push(START + k * STEP);
    const loops = angles.map((a): [number, number] => {
      const [x, y] = loop(a);
      const w = tug * Math.exp(-((a - a0) * R) / (6 * t));
      return [x + ((ex - ox) / pull) * w, y + ((ey - oy) / pull) * w];
    });
    // Each loop keeps its strands in place: the pattern is fixed to the angle, not the payout.
    const alongAt = (a: number) => (a - START) * R + 1e5;
    for (let k = 1; k < loops.length; k++)
      lay(loops[k - 1][0], loops[k - 1][1], loops[k][0], loops[k][1], alongAt(angles[k - 1]));
    // The end flops out of the pile: it turns gradually away from the middle and runs out past
    // the loops, so its cut end lies in the open.
    let [lx, ly] = loops[loops.length - 1];
    const [qx, qy] = loops[loops.length - 2];
    let dir = Math.atan2(ly - qy, lx - qx);
    let along = alongAt(a1);
    const tail: [number, number][] = [];
    for (let k = 0; k < 16; k++) {
      const out = Math.atan2(ly - py, lx - px);
      const turn = Math.atan2(Math.sin(out - dir), Math.cos(out - dir));
      dir += turn * 0.18;
      const [nx, ny] = [lx + Math.cos(dir) * t, ly + Math.sin(dir) * t];
      lay(lx, ly, nx, ny, along);
      along += t;
      [lx, ly] = [nx, ny];
      tail.push([lx, ly]);
    }
    // The curve from the laid rope to where it leaves the pile, on top of the loops it is
    // pulled over; its strands slide toward the laid rope as it pays out.
    const [sx0, sy0] = loops[0];
    const [dx, dy] = [loops[1][0] - sx0, loops[1][1] - sy0];
    const dl = Math.hypot(dx, dy) || 1;
    const c1 = [ex + Math.cos(ea) * t * 4, ey + Math.sin(ea) * t * 4];
    const c2 = [sx0 - (dx / dl) * t * 4, sy0 - (dy / dl) * t * 4];
    const bridge: [number, number][] = [[ex, ey]];
    let bridgeLength = 0;
    for (let k = 1; k <= 10; k++) {
      const u = k / 10;
      const v = 1 - u;
      bridge.push([
        ex * v ** 3 + 3 * c1[0] * v * v * u + 3 * c2[0] * v * u * u + sx0 * u ** 3,
        ey * v ** 3 + 3 * c1[1] * v * v * u + 3 * c2[1] * v * u * u + sy0 * u ** 3,
      ]);
      bridgeLength += Math.hypot(bridge[k][0] - bridge[k - 1][0], bridge[k][1] - bridge[k - 1][1]);
    }
    along = alongAt(a0) - bridgeLength;
    for (let k = 1; k < bridge.length; k++) {
      const [[x0, y0], [x1, y1]] = [bridge[k - 1], bridge[k]];
      lay(x0, y0, x1, y1, along);
      along += Math.hypot(x1 - x0, y1 - y0);
    }
    const pile = [...bridge, ...loops, ...tail];
    reset();

    // The rope's real ends: its start, and its end flopped out of the spare pile.
    if (this.tip.complete && this.tip.naturalWidth) {
      const tw = (this.tip.width / PX) * t;
      const th = (this.tip.height / PX) * t;
      // The start points back along the rope's own slope, so it carries on the rope's line.
      const [sx, sy, sa] = this.point(0);
      for (const [x, y, a] of [
        [sx, sy, sa + Math.PI],
        [lx, ly, dir],
      ]) {
        if (x < -tw || x > this.w + tw) continue;
        ctx.translate(x, y);
        ctx.rotate(a);
        if (Math.cos(a) < 0) ctx.scale(1, -1); // pointing left: mirror, so its light stays on top
        ctx.drawImage(this.tip, -TIP * t, -th / 2, tw, th);
        reset();
      }
    }

    // Each star: its knot on the rope, its avatar tied beside it, alternating above and below.
    // New knots pop in: they grow from nothing with a little overshoot.
    const r = t * AVATAR;
    const pop = (i: number) => {
      const at = this.born.get(i);
      return at === undefined ? 1 : popOut(Math.min((now - at) / POP, 1));
    };
    this.spots = [];
    ctx.strokeStyle = "rgb(35 32 28 / 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const tied: [number, number, number, number][] = []; // knot x, y, angle, star
    knots.forEach((k, i) => {
      if (i >= this.tied) return; // the rope hasn't paid out this far yet
      const s = k * t;
      if (s < this.scroll - r * 3 || s > this.scroll + this.w + r * 3) return;
      // On the chord between the rope under its picture's two ends, so both ends lie on the rope
      // even where it bends.
      const img = this.knots[this.kinds[i].id];
      const half = img.naturalWidth ? (img.width / PX / 2) * t : t * 2.5;
      const [x0, y0] = this.point(s - half);
      const [x1, y1] = this.point(s + half);
      const [x, y] = [(x0 + x1) / 2, (y0 + y1) / 2];
      const a = Math.atan2(y1 - y0, x1 - x0);
      // Alternating sides, each tie a little longer or shorter and leaning a little, by hand.
      const side = i % 2 ? 1 : -1;
      const off = (t * 1.3 + r + jitter(i, 1) * t * 1.6) * pop(i);
      const lean = a + (jitter(i, 2) - 0.5) * 0.7;
      const ax = x - Math.sin(lean) * off * side;
      const ay = y + Math.cos(lean) * off * side;
      ctx.moveTo(x, y);
      ctx.lineTo(ax, ay);
      tied.push([x, y, a, i]);
      this.spots.push({ i, x: ax, y: ay });
    });
    ctx.stroke();
    for (const [x, y, a, i] of tied) {
      const img = this.knots[this.kinds[i].id];
      if (!img.complete || !img.naturalWidth) continue;
      // Cinches: it shows up loose and long along the rope, then pulls tight.
      const at = this.born.get(i);
      const u = at === undefined ? 1 : Math.min((now - at) / POP, 1);
      const loose = (1 - u) ** 3;
      const kw = (img.width / PX) * t * (1 + 0.6 * loose);
      const kh = (img.height / PX) * t * (1 + 0.2 * loose);
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.drawImage(img, -kw / 2, -kh / 2, kw, kh);
      reset();
    }

    // Avatars, the searched-for star last so it sits on top of its neighbours.
    this.spots.sort((a, b) => Number(a.i === this.found) - Number(b.i === this.found));
    const grow = 1 - (1 - this.hoverGrow) ** 3;
    for (const { i, x, y } of this.spots) {
      const found = i === this.found;
      const hover = i === this.hovered;
      const rr = r * pop(i) * (found ? 1.6 : 1 + (hover ? 0.35 * grow : 0));
      if (rr < 0.5) continue;
      const cut = this.face(i, r);
      if (cut) ctx.drawImage(cut, x - rr, y - rr, rr * 2, rr * 2);
      else {
        ctx.fillStyle = "#d8cfc2";
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.strokeStyle = found || hover || i === this.tied - 1 ? ACCENT : "#fffdf9";
      ctx.lineWidth = found || hover ? 2.5 : 2;
      ctx.stroke();
      if (found) {
        // Rings pulse out from the found avatar for a moment.
        const age = now - this.foundAt;
        for (let k = 0; k < 3; k++) {
          const u = (age - k * 260) / 900;
          if (u <= 0 || u >= 1) continue;
          ctx.globalAlpha = 1 - u;
          ctx.beginPath();
          ctx.arc(x, y, rr + u * r * 2.2, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // A tag with the knot's number above the avatar.
        const label = `#${i + 1}`;
        ctx.font = "800 14px ui-sans-serif, system-ui, sans-serif";
        const w = ctx.measureText(label).width + 18;
        const ty = y - rr - 32;
        ctx.fillStyle = ACCENT;
        ctx.beginPath();
        ctx.roundRect(x - w / 2, ty, w, 24, 12);
        ctx.fill();
        ctx.fillStyle = "#fffdf9";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x, ty + 12);
      }
    }

    // An empty, dashed spot for the next star, tied where its knot will go, once every star is shown.
    this.slot = null;
    if (this.tied === this.stars.length) {
      const i = this.shown;
      const [x, y, a] = this.point(end - 4 * t);
      const side = i % 2 ? 1 : -1;
      const off = t * 1.3 + r + jitter(i, 1) * t * 1.6;
      const [sx, sy] = [x - Math.sin(a) * off * side, y + Math.cos(a) * off * side];
      this.slot = { x: sx, y: sy };
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(sx - Math.sin(a) * -r * side, sy + Math.cos(a) * -r * side);
      ctx.stroke();
      ctx.fillStyle = "rgb(255 253 249 / 0.7)";
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ACCENT;
      ctx.font = `700 ${Math.round(r)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("★", sx, sy + 1);
    }

    // A note on the spare rope, above the pile, the rope coming into it and the empty spot.
    const top = Math.min(...pile.map(([, y]) => y), this.slot ? this.slot.y - r : Infinity);
    ctx.fillStyle = ACCENT;
    ctx.font = "700 12px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("your knot goes here", px, top - t * 1.5); // moves with the pile
  }
}
