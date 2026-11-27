import type { UpdateSection } from "./updateService";
import styles from "./UpdateSectionsList.module.css";

const BADGE_KEY: Record<UpdateSection["type"], keyof typeof styles> = {
  features: "badgeFeatures",
  improvements: "badgeImprovements",
  fixes: "badgeFixes",
  announcements: "badgeAnnouncements",
  other: "badgeOther",
};

/** Renders categorized release-note sections. */
export function UpdateSectionsList({ sections }: { sections: UpdateSection[] }) {
  return (
    <div className={styles.sectionsList}>
      {sections.map((sec, secIdx) => (
        <div key={secIdx} className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <span className={`${styles.categoryBadge} ${styles[BADGE_KEY[sec.type]]}`}>
              {sec.title}
            </span>
          </div>
          <ul className={styles.list}>
            {sec.items.map((item, itemIdx) => (
              <li key={itemIdx} className={styles.listItem}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
