import { useRef, useState } from "react";
import { useMountEffect } from "../../shared/hooks";
import { StarIcon } from "../../shared/ui/icons";
import { type Feed, decodeFeed } from "./feed";
import { knotFor } from "./layout";
import { type Star, StarRope } from "./rope";
import styles from "./strip.module.css";

/** How many of the newest stars are tied as the strip scrolls into view. */
const LAST = 30;
const day = (iso: string) => new Date(iso).toLocaleDateString("en", { dateStyle: "medium" });

/** Every GitHub star as a knot on one rope, as a strip to drag along. `src` is the stargazer feed. */
export function StargazerStrip({ src, repoUrl }: { src: string; repoUrl: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const rope = useRef<StarRope>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [hover, setHover] = useState<{ star: Star; x: number; y: number; w: number } | null>(null);

  useMountEffect(() => {
    const el = canvas.current!;
    const r = new StarRope(el, () => ({ top: 4, bottom: el.clientHeight - 4 }));
    rope.current = r;
    let timer = 0;
    let watch: IntersectionObserver | undefined;
    fetch(src)
      .then((res) => res.json() as Promise<Feed>)
      .then((feed) => {
        const stars = decodeFeed(feed);
        const n = stars.length;
        r.setStars(stars);
        setTotal(n);
        const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const from = Math.max(n - LAST, 0);
        r.setCount(calm ? n : from);
        if (calm) return;
        // Tie the newest stars one by one once the strip is on screen.
        watch = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            watch?.disconnect();
            let c = from;
            timer = window.setInterval(() => {
              r.setCount(++c);
              if (c >= n) clearInterval(timer);
            }, 120);
          },
          { threshold: 0.5 },
        );
        watch.observe(el);
      })
      .catch(() => {});
    return () => {
      clearInterval(timer);
      watch?.disconnect();
      r.dispose();
    };
  });

  const kind = hover && knotFor(hover.star.user.id);
  return (
    <section id="stargazers" className={styles.section} aria-label="Stargazer rope">
      <div className={styles.head}>
        <p>
          Everyone who stars the project ties a knot on this rope.{" "}
          <span>{total === null ? "" : `${total.toLocaleString()} stars so far.`}</span>
        </p>
        <a className={styles.cta} href={repoUrl} target="_blank" rel="noopener">
          <StarIcon /> Tie knot #{((total ?? 0) + 1).toLocaleString()}
        </a>
      </div>
      <div className={styles.wrap}>
        <canvas
          ref={canvas}
          aria-label="Every GitHub star as a knot on one rope. Drag sideways to move along it."
          style={{ cursor: hover ? "pointer" : undefined }}
          onPointerMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            const star = rope.current?.pick(e.clientX - box.left, e.clientY - box.top);
            setHover(
              star ? { star, x: e.clientX - box.left, y: e.clientY - box.top, w: box.width } : null,
            );
          }}
          onPointerLeave={() => {
            rope.current?.pick(-1e9, -1e9);
            setHover(null);
          }}
          onClick={() => {
            if (hover && !rope.current?.swiped)
              window.open(hover.star.user.html_url, "_blank", "noopener");
          }}
        />
        {hover && kind && (
          <div
            className={styles.tip}
            style={{
              left: Math.min(Math.max(hover.x, 90), hover.w - 90),
              top: Math.max(hover.y - 36, 60),
            }}
          >
            <strong>@{hover.star.user.login}</strong>
            <span>
              {kind.name} · {Math.round(kind.odds * 100)}% of stargazers
            </span>
            <span>starred {day(hover.star.starred_at)}</span>
          </div>
        )}
      </div>
    </section>
  );
}
