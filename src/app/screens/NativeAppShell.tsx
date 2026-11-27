import { Search } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { knots } from "../../engine/knots";
import { Player } from "../../engine/playback/player";
import { BottomNav, type NavTab } from "../features/navigation";
import { KnotGrid } from "../features/picker";
import { checkForUpdate, type UpdateInfo } from "../features/updater";
import { dismissTopOverlay, useMountEffect } from "../shared/hooks";
import { platform } from "../shared/platformBridge";
import {
  getCheckUpdatesOnStartup,
  getHasSeenInfo,
  getThemePreference,
  setHasSeenInfo,
  setLastUpdateCheckTime,
} from "../shared/settings";
import { SITE_NAME } from "../shared/site";
import { getInstalledVersion } from "../shared/version";
import { AboutScreen } from "./AboutScreen";
import { FavoritesScreen } from "./FavoritesScreen";
import { InfoScreen } from "./InfoScreen";
import { NewScreen } from "./NewScreen";
import { SettingsScreen } from "./SettingsScreen";
import styles from "./HomeScreen.module.css";

const first = knots[0];

// Module-level persistent cache across screen unmounts / navigations
const savedTabScrollPositions: Record<string, number> = {};
const SCROLL_TABS = new Set<NavTab>(["home", "favorites", "new", "settings"]);
let tabHistory: NavTab[] = ["home"];
let isRestoringScroll = false;
let restoreRaf = 0;
let restoreTimer = 0;

function cancelRestoreScroll() {
  cancelAnimationFrame(restoreRaf);
  clearTimeout(restoreTimer);
  isRestoringScroll = false;
}

function saveTabScroll(tab: NavTab) {
  if (isRestoringScroll || !SCROLL_TABS.has(tab)) return;
  savedTabScrollPositions[tab] = window.scrollY;
  try {
    sessionStorage.setItem(`knots_scroll_${tab}`, String(window.scrollY));
  } catch {}
}

function restoreTabScroll(tab: NavTab, getEl: (t: NavTab) => HTMLDivElement | null) {
  cancelRestoreScroll();
  if (!SCROLL_TABS.has(tab)) return;
  let targetY = savedTabScrollPositions[tab];
  if (targetY === undefined) {
    try {
      const stored = sessionStorage.getItem(`knots_scroll_${tab}`);
      if (stored) targetY = Number(stored);
    } catch {}
  }
  const scrollY = targetY ?? 0;
  isRestoringScroll = true;

  let attempts = 0;
  const applyWhenVisible = () => {
    const el = getEl(tab);
    const visible = el !== null && el.style.display !== "none";
    if (!visible && attempts < 12) {
      attempts++;
      restoreRaf = requestAnimationFrame(applyWhenVisible);
      return;
    }
    window.scrollTo({ top: scrollY, behavior: "instant" });
    restoreRaf = requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: "instant" });
      isRestoringScroll = false;
    });
  };

  restoreTimer = window.setTimeout(() => {
    restoreRaf = requestAnimationFrame(applyWhenVisible);
  }, 0);
}

function getActiveTab(params: URLSearchParams): NavTab {
  const tabParam = params.get("tab") as NavTab | null;
  if (tabParam && ["home", "favorites", "new", "settings", "about", "info"].includes(tabParam)) {
    return tabParam;
  }
  return !getHasSeenInfo() ? "info" : "home";
}

/** Native mobile app shell switching between tabs with BottomNav. */
export function NativeAppShell() {
  const [player] = useState(() => Player.forKnot(first));
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");

  const activeTab = getActiveTab(searchParams);

  const [optimisticNav, setOptimisticNav] = useState<{
    fromTab: NavTab;
    toTab: NavTab;
  } | null>(null);
  const currentNavTab =
    optimisticNav && optimisticNav.fromTab === activeTab ? optimisticNav.toTab : activeTab;
  const [startupUpdateInfo, setStartupUpdateInfo] = useState<UpdateInfo | null>(null);
  const tabRefs = useRef<Partial<Record<NavTab, HTMLDivElement | null>>>({});
  const getTabEl = useCallback((t: NavTab) => tabRefs.current[t] ?? null, []);

  const switchTab = useCallback(
    (current: NavTab, tab: NavTab, recordHistory = true) => {
      if (tab === current) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (recordHistory) {
        if (tab === "home") tabHistory = ["home"];
        else if (tabHistory[tabHistory.length - 1] !== tab) tabHistory.push(tab);
      }
      saveTabScroll(current);
      isRestoringScroll = true;
      setOptimisticNav({ fromTab: current, toTab: tab });
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", tab);
          return next;
        },
        { replace: true },
      );
      restoreTabScroll(tab, getTabEl);
    },
    [getTabEl, setSearchParams],
  );

  const handleSelectTab = useCallback(
    (tab: NavTab) => switchTab(activeTab, tab, true),
    [activeTab, switchTab],
  );

  useMountEffect(() => {
    if (getHasSeenInfo() && getCheckUpdatesOnStartup()) {
      checkForUpdate(getInstalledVersion())
        .then((info) => {
          setLastUpdateCheckTime(Date.now());
          if (info.isUpdateAvailable) {
            setStartupUpdateInfo(info);
            if (getActiveTab(new URLSearchParams(window.location.search)) === "home") {
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  next.set("tab", "settings");
                  return next;
                },
                { replace: true },
              );
            }
          }
        })
        .catch(() => {});
    }

    let animId: number;
    const handle = requestAnimationFrame(() => {
      animId = requestAnimationFrame(() => {
        try {
          platform.notifyAppReady(getThemePreference());
        } catch {}
      });
    });

    const preloadKnotRoute = () => {
      import("../routes/knot").catch(() => {});
      import("../../engine/render/viewer").catch(() => {});
    };
    let idleId: number | undefined;
    let preloadTimer: ReturnType<typeof setTimeout> | undefined;
    if ("requestIdleCallback" in window) {
      idleId = (
        window as unknown as { requestIdleCallback: (cb: () => void) => number }
      ).requestIdleCallback(preloadKnotRoute);
    } else {
      preloadTimer = setTimeout(preloadKnotRoute, 200);
    }

    const handleScroll = () =>
      saveTabScroll(getActiveTab(new URLSearchParams(window.location.search)));
    window.addEventListener("scroll", handleScroll, { passive: true });
    const win = window as unknown as {
      __setTab?: (tab: NavTab) => void;
      __onSystemBack?: () => boolean;
    };
    win.__setTab = (tab) => {
      const current = getActiveTab(new URLSearchParams(window.location.search));
      switchTab(current, tab, true);
    };
    win.__onSystemBack = () => {
      if (dismissTopOverlay()) return true;
      const current = getActiveTab(new URLSearchParams(window.location.search));
      if (current === "about" || (current === "info" && getHasSeenInfo())) {
        if (tabHistory[tabHistory.length - 1] === current) tabHistory.pop();
        switchTab(current, "settings", false);
        return true;
      }
      if (tabHistory.length > 1) {
        tabHistory.pop();
        const prevTab = tabHistory[tabHistory.length - 1] ?? "home";
        switchTab(current, prevTab, false);
        return true;
      }
      if (current !== "home" && !(current === "info" && !getHasSeenInfo())) {
        tabHistory = ["home"];
        switchTab(current, "home", false);
        return true;
      }
      return false;
    };
    restoreTabScroll(activeTab, getTabEl);

    return () => {
      cancelAnimationFrame(handle);
      cancelAnimationFrame(animId);
      cancelRestoreScroll();
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(
          idleId,
        );
      }
      if (preloadTimer !== undefined) clearTimeout(preloadTimer);
      window.removeEventListener("scroll", handleScroll);
      delete win.__setTab;
      delete win.__onSystemBack;
    };
  });

  const handleCompleteInfoOnboarding = () => {
    setHasSeenInfo(true);
    handleSelectTab("home");
  };

  const hasSeen = getHasSeenInfo();
  const isOverviewSubPage = activeTab === "info" && hasSeen;
  const isAboutSubPage = activeTab === "about";
  const isSettingsActive = activeTab === "settings" || isOverviewSubPage || isAboutSubPage;

  return (
    <div className="site">
      <main className={`${styles.page} ${styles.appContainer}`}>
        {/* Home Tab */}
        <div
          ref={(el) => {
            tabRefs.current.home = el;
          }}
          style={{ display: activeTab === "home" ? undefined : "none" }}
        >
          <header className={styles.mobileAppHeader}>
            <h1 className={styles.mobileAppTitle}>{SITE_NAME}</h1>
          </header>

          <div className={styles.searchWrap}>
            <Search className={styles.searchIcon} size={18} aria-hidden />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search knots or uses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search knots"
            />
          </div>

          <KnotGrid
            knots={knots}
            searchQuery={searchQuery}
            currentTab={activeTab}
            onBeforeNavigate={() => saveTabScroll("home")}
          />
        </div>

        {/* Favorites Tab */}
        <div
          ref={(el) => {
            tabRefs.current.favorites = el;
          }}
          style={{ display: activeTab === "favorites" ? undefined : "none" }}
        >
          <FavoritesScreen onBrowse={() => handleSelectTab("home")} />
        </div>

        {/* New Tab */}
        <div
          ref={(el) => {
            tabRefs.current.new = el;
          }}
          style={{ display: activeTab === "new" ? undefined : "none" }}
        >
          <NewScreen />
        </div>

        {/* Initial Onboarding InfoScreen (only before completion) */}
        {activeTab === "info" && !hasSeen && (
          <InfoScreen
            firstKnot={first}
            player={player}
            onBack={() => {
              setHasSeenInfo(true);
              handleSelectTab("settings");
            }}
            onBrowseKnots={handleCompleteInfoOnboarding}
          />
        )}

        {/* Settings Tab - kept mounted so update state & scroll are never lost */}
        <div
          ref={(el) => {
            tabRefs.current.settings = el;
          }}
          style={{ display: isSettingsActive ? undefined : "none" }}
        >
          <SettingsScreen
            onOpenAbout={() => handleSelectTab("about")}
            onOpenInfo={() => handleSelectTab("info")}
            initialUpdateInfo={startupUpdateInfo}
          />

          {/* Sub-screens overlay directly on top of Settings */}
          {(isAboutSubPage || isOverviewSubPage) && (
            <div className={styles.subPageOverlay}>
              <div className={styles.subPageOverlayInner}>
                {isAboutSubPage && <AboutScreen onBack={() => handleSelectTab("settings")} />}
                {isOverviewSubPage && (
                  <InfoScreen
                    firstKnot={first}
                    player={player}
                    onBack={() => handleSelectTab("settings")}
                    onBrowseKnots={handleCompleteInfoOnboarding}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNav activeTab={currentNavTab} onSelectTab={handleSelectTab} />
    </div>
  );
}
