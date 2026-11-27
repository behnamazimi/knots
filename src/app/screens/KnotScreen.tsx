import { ArrowLeft, Heart } from "lucide-react";
import { flushSync } from "react-dom";
import { useRef, useState, useSyncExternalStore } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { isLatestKnot, knots } from "../../engine/knots";
import type { KnotDef } from "../../engine/knots/types";
import { Player } from "../../engine/playback/player";
import { physicsFromParams } from "../features/tuner";
import { useIsNativeApp } from "../shared/appMode";
import { toggleFavorite, useFavorites } from "../shared/favorites";
import { useMountEffect } from "../shared/hooks";
import { KNOT_INFO } from "../shared/knotInfo";
import { platform } from "../shared/platformBridge";
import { getThemePreference } from "../shared/settings";
import { REPO_URL, knotPath } from "../shared/site";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  InfoIcon,
  ListIcon,
  WarningIcon,
} from "../shared/ui/icons";
import { SiteFooter, SiteHeader, linkClass } from "../shared/ui/SiteChrome";
import { KnotStage } from "./KnotStage";
import styles from "./KnotScreen.module.css";

const savedKnotScrollPositions: Record<string, number> = {};

function saveKnotScroll(knotId: string) {
  savedKnotScrollPositions[knotId] = window.scrollY;
  try {
    sessionStorage.setItem(`knots_knot_scroll_${knotId}`, String(window.scrollY));
  } catch {}
}

function getSavedKnotScroll(knotId: string): number {
  if (savedKnotScrollPositions[knotId] !== undefined) return savedKnotScrollPositions[knotId];
  try {
    const stored = sessionStorage.getItem(`knots_knot_scroll_${knotId}`);
    if (stored) return Number(stored);
  } catch {}
  return 0;
}

/** A knot's whole page: the sticky live view beside its name, uses, steps and related knots. */
export function KnotScreen({ knot }: { knot: KnotDef }) {
  const [params] = useSearchParams();
  const physics = physicsFromParams(params);
  // A new knot or rope material starts a fresh session (viewer, bake, player) by remounting.
  return <Session key={`${knot.id} ${JSON.stringify(physics)}`} knot={knot} physics={physics} />;
}

function Session({
  knot,
  physics,
}: {
  knot: KnotDef;
  physics: ReturnType<typeof physicsFromParams>;
}) {
  // Plain data, so the prerendered page shows the same first step and duration as the browser.
  const [player] = useState(() => Player.forKnot(knot));
  const [wide, setWide] = useState(false);
  const isNativeApp = useIsNativeApp();
  const favorites = useFavorites();
  const isFav = favorites.includes(knot.id);
  const navigate = useNavigate();
  const location = useLocation();

  const isLeavingRef = useRef(false);

  const handleBack = () => {
    player.pause();
    if (isNativeApp) saveKnotScroll(knot.id);
    isLeavingRef.current = true;
    const canGoBack = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;
    if (canGoBack) {
      navigate(-1);
    } else {
      const fromTab = (location.state as { fromTab?: string })?.fromTab;
      navigate(fromTab ? `/?tab=${fromTab}` : "/", { replace: true });
    }
  };

  const handleBackRef = useRef(handleBack);
  // oxlint-disable-next-line react/refs
  handleBackRef.current = handleBack;

  useMountEffect(() => {
    let animId: number;
    let scrollRaf = 0;
    const handle = requestAnimationFrame(() => {
      animId = requestAnimationFrame(() => {
        try {
          platform.notifyAppReady(getThemePreference());
        } catch {}
      });
    });
    const win = window as unknown as { __onSystemBack?: () => boolean };
    win.__onSystemBack = () => {
      handleBackRef.current();
      return true;
    };
    const onScroll = () => {
      if (isNativeApp && !isLeavingRef.current) saveKnotScroll(knot.id);
    };
    if (isNativeApp) {
      const targetY = getSavedKnotScroll(knot.id);
      window.scrollTo({ top: targetY, behavior: "instant" });
      if (targetY > 0) {
        scrollRaf = requestAnimationFrame(() => {
          window.scrollTo({ top: targetY, behavior: "instant" });
        });
      }
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    return () => {
      isLeavingRef.current = true;
      cancelAnimationFrame(handle);
      cancelAnimationFrame(animId);
      cancelAnimationFrame(scrollRaf);
      if (isNativeApp) window.removeEventListener("scroll", onScroll);
      delete win.__onSystemBack;
    };
  });

  // Morph the stage between layouts where the browser can; otherwise just switch.
  const toggleWide = () => {
    const swap = () => flushSync(() => setWide((w) => !w));
    if (document.startViewTransition) document.startViewTransition(swap);
    else swap();
  };
  const info = KNOT_INFO[knot.id];

  return (
    <div className="site">
      {isNativeApp ? (
        <header className={styles.nativeAppBar}>
          <button
            type="button"
            className={styles.nativeAppBarBtn}
            onClick={handleBack}
            aria-label="Back to all knots"
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className={styles.nativeAppBarTitle}>{knot.name}</h2>
          <button
            type="button"
            className={styles.nativeAppBarBtn}
            onClick={() => toggleFavorite(knot.id)}
            aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              size={22}
              fill={isFav ? "#b9522c" : "none"}
              color={isFav ? "#b9522c" : "currentColor"}
            />
          </button>
        </header>
      ) : (
        <SiteHeader />
      )}

      <main className={styles.page}>
        <div className={`${styles.cols} ${wide ? styles.wideCols : ""}`}>
          <article className={`${styles.article} ${isNativeApp ? styles.nativeArticle : ""}`}>
            {!isNativeApp && (
              <Link
                className={styles.back}
                to="/"
                onClick={(e) => {
                  if (window.history.length > 1) {
                    e.preventDefault();
                    navigate(-1);
                  }
                }}
              >
                <ChevronLeftIcon />
                All knots
              </Link>
            )}
            <h1 className={styles.title}>
              {knot.name}
              {isNativeApp && isLatestKnot(knot.id) && (
                <span className={styles.newBadge}>
                  <span className={styles.newBadgeStar}>✦</span>
                  New
                </span>
              )}
            </h1>
            <p className={styles.lead}>{knot.summary}</p>
            <dl className={styles.facts}>
              {[
                ["Type", info.type],
                ["Steps", String(knot.steps.length)],
                ["Time", `${Math.round(knot.duration * 10) / 10} s`],
                ["Ropes", String(knot.ropes.length)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <section className={styles.section}>
              <h2>
                <CheckIcon />
                What it’s for
              </h2>
              <ul className={`${styles.list} ${styles.uses}`}>
                {info.uses.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </section>
            <section className={styles.section}>
              <h2>
                <InfoIcon />
                Good to know
              </h2>
              <p>{info.watch}</p>
            </section>
            <section className={styles.section}>
              <h2>
                <ListIcon />
                How to tie it
              </h2>
              <StepList knot={knot} player={player} />
            </section>
            <section className={styles.section}>
              <h2>
                <ArrowRightIcon />
                Related knots
              </h2>
              <div className={styles.related}>
                {info.related.map((id) => (
                  <Link key={id} className={linkClass} to={knotPath(id)}>
                    {knots.find((k) => k.id === id)?.name}
                  </Link>
                ))}
              </div>
            </section>
            <section className={styles.section}>
              <h2>
                <WarningIcon />
                Before you rely on it
              </h2>
              <p>
                The rope here is simulated. Real rope differs in stiffness, friction and size, so
                practise with real rope and check the result by hand. Do not rely on a knot learned
                here where a failure could hurt someone.
              </p>
              <p className={styles.small}>
                Written for this site and not yet checked against a published knot reference. Spot a
                mistake?{" "}
                <a
                  className={linkClass}
                  href={`${REPO_URL}/blob/main/src/engine/knots/${knot.id}.ts`}
                  target="_blank"
                  rel="noopener"
                >
                  Improve this knot on GitHub
                </a>
                .
              </p>
            </section>
          </article>
          <KnotStage
            knot={knot}
            player={player}
            physics={physics}
            wide={isNativeApp ? wide : false}
            onToggleWide={isNativeApp ? toggleWide : undefined}
            className={styles.stage}
          />
        </div>
      </main>

      {!isNativeApp && <SiteFooter />}
    </div>
  );
}

/** The steps as a list; the current one is marked, and a click plays from there. */
function StepList({ knot, player }: { knot: KnotDef; player: Player }) {
  const { step } = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot);
  return (
    <ol className={`${styles.list} ${styles.steps}`}>
      {knot.steps.map((s, i) => (
        <li key={s.t} aria-current={i === step ? "step" : undefined}>
          <button
            type="button"
            onClick={() => {
              player.seek(s.t);
              player.play();
            }}
          >
            <i>{i + 1}</i>
            <span>{s.title}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
