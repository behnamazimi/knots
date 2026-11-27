import { useState } from "react";
import {
  ArrowUpCircle,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  History,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { RELEASES_URL, SITE_NAME } from "../shared/site";
import { getInstalledVersion } from "../shared/version";
import {
  ChangelogSheet,
  UpdateSectionsList,
  checkForUpdate,
  triggerUpdate,
  type UpdateInfo,
} from "../features/updater";
import {
  setLastUpdateCheckTime,
  type QualityPreference,
  type ThemePreference,
  useSettings,
} from "../shared/settings";
import styles from "./SettingsScreen.module.css";

interface SettingsScreenProps {
  onOpenAbout?: () => void;
  onOpenInfo?: () => void;
  initialUpdateInfo?: UpdateInfo | null;
}

export function SettingsScreen({
  onOpenAbout,
  onOpenInfo,
  initialUpdateInfo,
}: SettingsScreenProps) {
  const currentVersion = getInstalledVersion();
  const {
    theme,
    quality,
    checkUpdatesOnStartup,
    applyTheme,
    setQualityPreference,
    setCheckUpdatesOnStartup,
  } = useSettings();

  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "checking" | "up-to-date" | "update-available" | "error"
  >(() => {
    if (initialUpdateInfo?.isUpdateAvailable) return "update-available";
    if (initialUpdateInfo) return "up-to-date";
    return "idle";
  });
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(() => initialUpdateInfo ?? null);
  const [expandedNotes, setExpandedNotes] = useState(() =>
    Boolean(initialUpdateInfo?.isUpdateAvailable),
  );
  const [prevInitialUpdateInfo, setPrevInitialUpdateInfo] = useState(initialUpdateInfo);
  if (initialUpdateInfo && initialUpdateInfo !== prevInitialUpdateInfo) {
    setPrevInitialUpdateInfo(initialUpdateInfo);
    setUpdateInfo(initialUpdateInfo);
    setUpdateStatus(initialUpdateInfo.isUpdateAvailable ? "update-available" : "up-to-date");
    if (initialUpdateInfo.isUpdateAvailable) {
      setExpandedNotes(true);
    }
  }
  const [showChangelog, setShowChangelog] = useState(false);

  const handleCheckUpdates = async () => {
    setUpdateStatus("checking");
    try {
      const info = await checkForUpdate(currentVersion);
      setUpdateInfo(info);
      setUpdateStatus(info.isUpdateAvailable ? "update-available" : "up-to-date");
      if (info.isUpdateAvailable) {
        setExpandedNotes(true);
      }
      setLastUpdateCheckTime(Date.now());
    } catch {
      setUpdateStatus("error");
    }
  };

  const handleApplyUpdate = () => {
    if (updateInfo) {
      triggerUpdate(updateInfo);
    }
  };

  const themeOptions: { id: ThemePreference; label: string; desc: string }[] = [
    { id: "system", label: "System Default", desc: "Follow device dark mode settings" },
    { id: "light", label: "Light", desc: "Clean paper and stage backdrop" },
    { id: "dark", label: "Dark", desc: "Dimmed palette for low-light environments" },
  ];

  const qualityOptions: { id: QualityPreference; label: string; desc: string }[] = [
    { id: "high", label: "High Fidelity", desc: "24 XPBD physics substeps / 60 FPS" },
    {
      id: "battery",
      label: "Battery Saver",
      desc: "Low-density rope mesh, no shadows, 1× pixel ratio",
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
      </div>

      {(onOpenAbout || onOpenInfo) && (
        <section className={styles.section}>
          <div className={styles.card}>
            {onOpenAbout && (
              <div
                className={styles.aboutRow}
                onClick={onOpenAbout}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenAbout();
                  }
                }}
              >
                <div className={styles.aboutRowLeft}>
                  <div className={styles.aboutIconBox}>
                    <Info size={18} />
                  </div>
                  <div className={styles.optionText}>
                    <span className={styles.optionLabel}>About {SITE_NAME}</span>
                    <span className={styles.optionDesc}>v{currentVersion}</span>
                  </div>
                </div>
                <ChevronRight size={18} className={styles.chevron} />
              </div>
            )}

            {onOpenInfo && (
              <div
                className={styles.aboutRow}
                onClick={onOpenInfo}
                role="button"
                tabIndex={0}
                style={{ borderTop: onOpenAbout ? "1px solid var(--line)" : undefined }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenInfo();
                  }
                }}
              >
                <div className={styles.aboutRowLeft}>
                  <div className={styles.aboutIconBox}>
                    <BookOpen size={18} />
                  </div>
                  <div className={styles.optionText}>
                    <span className={styles.optionLabel}>Overview</span>
                  </div>
                </div>
                <ChevronRight size={18} className={styles.chevron} />
              </div>
            )}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.card}>
          <div
            className={styles.updateRow}
            onClick={() => {
              if (updateStatus === "update-available") {
                handleApplyUpdate();
              } else if (updateStatus !== "checking") {
                handleCheckUpdates();
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (updateStatus === "update-available") {
                  handleApplyUpdate();
                } else if (updateStatus !== "checking") {
                  handleCheckUpdates();
                }
              }
            }}
          >
            <div className={styles.updateRowLeft}>
              <div className={styles.updateIconBox}>
                {updateStatus === "checking" ? (
                  <Loader2 size={18} className={styles.spinner} />
                ) : updateStatus === "up-to-date" ? (
                  <CheckCircle2 size={18} className={styles.successIcon} />
                ) : updateStatus === "update-available" ? (
                  <ArrowUpCircle size={18} className={styles.updateAvailableIcon} />
                ) : (
                  <RefreshCw size={18} />
                )}
              </div>
              <div className={styles.optionText}>
                <span className={styles.optionLabel}>
                  {updateStatus === "update-available"
                    ? `Update Available (${updateInfo?.version})`
                    : "Check for updates"}
                </span>
                {updateStatus !== "update-available" && (
                  <span className={styles.optionDesc}>
                    {updateStatus === "checking"
                      ? "Checking for updates..."
                      : updateStatus === "up-to-date"
                        ? `Up to date (v${currentVersion})`
                        : updateStatus === "error"
                          ? "Could not check for updates"
                          : "Tap to check for new releases"}
                  </span>
                )}
              </div>
            </div>
            <div>
              {updateStatus === "update-available" ? (
                <button
                  type="button"
                  className={styles.updateIconButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyUpdate();
                  }}
                  aria-label="Download and install update"
                >
                  <Download size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.checkButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCheckUpdates();
                  }}
                  disabled={updateStatus === "checking"}
                  aria-label="Check for updates"
                >
                  <RefreshCw
                    size={16}
                    className={updateStatus === "checking" ? styles.spinner : ""}
                  />
                </button>
              )}
            </div>
          </div>

          {updateStatus === "update-available" && updateInfo?.notes && (
            <div className={styles.notesBox}>
              <div
                className={styles.notesHeader}
                onClick={() => setExpandedNotes(!expandedNotes)}
                role="button"
                tabIndex={0}
              >
                <span className={styles.notesTitle}>What's new in {updateInfo.version}</span>
                <ChevronDown
                  size={16}
                  className={`${styles.notesChevron} ${expandedNotes ? styles.notesChevronOpen : ""}`}
                />
              </div>
              {expandedNotes && (
                <div className={styles.notesContent}>
                  {updateInfo.sections && updateInfo.sections.length > 0 ? (
                    <UpdateSectionsList sections={updateInfo.sections} />
                  ) : (
                    <pre className={styles.notesPre}>{updateInfo.notes}</pre>
                  )}
                </div>
              )}
            </div>
          )}

          <div
            className={styles.option}
            onClick={() => setCheckUpdatesOnStartup(!checkUpdatesOnStartup)}
            role="switch"
            aria-checked={checkUpdatesOnStartup}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setCheckUpdatesOnStartup(!checkUpdatesOnStartup);
              }
            }}
          >
            <div className={styles.updateRowLeft}>
              <div className={styles.changelogIconBox}>
                <Bell size={18} />
              </div>
              <div className={styles.optionText}>
                <span className={styles.optionLabel}>Check for updates on startup</span>
                <span className={styles.optionDesc}>
                  Automatically check for new releases when app launches
                </span>
              </div>
            </div>
            <div className={`${styles.switch} ${checkUpdatesOnStartup ? styles.switchOn : ""}`}>
              <div className={styles.switchThumb} />
            </div>
          </div>

          <div
            className={styles.option}
            onClick={() => setShowChangelog(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowChangelog(true);
              }
            }}
          >
            <div className={styles.updateRowLeft}>
              <div className={styles.changelogIconBox}>
                <History size={18} />
              </div>
              <div className={styles.optionText}>
                <span className={styles.optionLabel}>View Changelog</span>
                <span className={styles.optionDesc}>See what's new in each release so far</span>
              </div>
            </div>
            <ChevronRight size={18} className={styles.chevron} />
          </div>
        </div>

        <div className={styles.releaseNoteText}>
          Releases are published directly on{" "}
          <a href={RELEASES_URL} target="_blank" rel="noopener" className={styles.releaseLink}>
            GitHub Releases <ExternalLink size={11} className={styles.extIcon} />
          </a>
          .
        </div>
      </section>

      {showChangelog && <ChangelogSheet onClose={() => setShowChangelog(false)} />}

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Appearance</div>
        <div className={styles.card}>
          {themeOptions.map((opt) => {
            const isSelected = theme === opt.id;
            return (
              <div
                key={opt.id}
                className={styles.option}
                onClick={() => applyTheme(opt.id)}
                role="radio"
                aria-checked={isSelected}
              >
                <div className={styles.optionText}>
                  <span className={styles.optionLabel}>{opt.label}</span>
                  <span className={styles.optionDesc}>{opt.desc}</span>
                </div>
                <div className={`${styles.radio} ${isSelected ? styles.radioSelected : ""}`}>
                  {isSelected && <div className={styles.radioInner} />}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Physics & Simulation</div>
        <div className={styles.card}>
          {qualityOptions.map((opt) => {
            const isSelected = quality === opt.id;
            return (
              <div
                key={opt.id}
                className={styles.option}
                onClick={() => setQualityPreference(opt.id)}
                role="radio"
                aria-checked={isSelected}
              >
                <div className={styles.optionText}>
                  <span className={styles.optionLabel}>{opt.label}</span>
                  <span className={styles.optionDesc}>{opt.desc}</span>
                </div>
                <div className={`${styles.radio} ${isSelected ? styles.radioSelected : ""}`}>
                  {isSelected && <div className={styles.radioInner} />}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
