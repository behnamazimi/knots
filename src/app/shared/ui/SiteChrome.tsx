import { Link } from "react-router";
import { REPO_URL, SITE_NAME } from "../site";
import styles from "./SiteChrome.module.css";

/** Class for an inline text link: underlined in a faint line that picks up the accent on hover. */
export const linkClass = styles.u;

/** Taken when the page is prerendered; the next deploy rolls it over. */
const YEAR = new Date().getFullYear();

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link className={styles.mark} to="/">
        {SITE_NAME}
      </Link>
      <nav className={styles.nav} aria-label="Main">
        <a href={REPO_URL} target="_blank" rel="noopener">
          GitHub
        </a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <p className={styles.maker}>
        Built by{" "}
        <a
          className={styles.u}
          href="https://github.com/behnamazimi"
          target="_blank"
          rel="noopener"
        >
          Behnam Azimi
        </a>{" "}
        and contributors. I add knots one at a time. If you want one,{" "}
        <a className={styles.u} href={`${REPO_URL}/issues`} target="_blank" rel="noopener">
          open an issue
        </a>
        .
      </p>
      <p>
        Free and open source.{" "}
        <Link className={styles.u} to="/recorder/">
          Record your own knot
        </Link>{" "}
        ·{" "}
        <a className={styles.u} href={REPO_URL} target="_blank" rel="noopener">
          Source
        </a>
      </p>
      <p>
        © {YEAR} - {SITE_NAME}
      </p>
    </footer>
  );
}
