import { ArrowLeft } from "lucide-react";
import { REPO_URL, SITE_NAME } from "../shared/site";
import { getInstalledVersion } from "../shared/version";
import { GitHubIcon, GlobeIcon } from "../shared/ui/icons";
import styles from "./AboutScreen.module.css";

interface AboutScreenProps {
  onBack?: () => void;
}

export function AboutScreen({ onBack }: AboutScreenProps = {}) {
  const currentVersion = getInstalledVersion();
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {onBack && (
          <button
            type="button"
            className={styles.backBtn}
            onClick={onBack}
            aria-label="Back to Settings"
          >
            <ArrowLeft size={18} />
            <span>Settings</span>
          </button>
        )}
        <h1 className={styles.title}>About</h1>
      </div>

      <div className={styles.card}>
        <div className={styles.brand}>
          <h2 className={styles.appName}>{SITE_NAME}</h2>
          <span className={styles.version}>v{currentVersion}</span>
          <p className={styles.summary}>
            Interactive 3D knot-tying simulator running real-time Cosserat rod XPBD physics on
            WebGL2.
          </p>
        </div>

        <div className={styles.authorBox}>
          Created by{" "}
          <a href="https://x.com/bazc78" target="_blank" rel="noopener">
            Behnam Azimi (@bazc78)
          </a>{" "}
          and open-source contributors.
        </div>
      </div>

      <div className={styles.actions}>
        <a
          href="https://knots-made-easy.pages.dev/"
          target="_blank"
          rel="noopener"
          className={styles.actionBtn}
        >
          <GlobeIcon />
          <span>knots-made-easy.pages.dev</span>
        </a>
        <a href={REPO_URL} target="_blank" rel="noopener" className={styles.actionBtn}>
          <GitHubIcon />
          <span>Source Code on GitHub</span>
        </a>
        <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener" className={styles.actionBtn}>
          <span>Report an Issue / Request Knot</span>
        </a>
      </div>

      <p className={styles.legal}>
        Open Source under the MIT License.
        <br />
        Built with React 19, Three.js, and AndroidX WebKit.
      </p>
    </div>
  );
}
