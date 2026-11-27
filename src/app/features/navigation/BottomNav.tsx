import { CalendarPlus, Heart, Home, Settings } from "lucide-react";
import styles from "./BottomNav.module.css";

export type NavTab = "home" | "favorites" | "new" | "settings" | "about" | "info";

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  const tabs: { id: NavTab; label: string; Icon: typeof Home }[] = [
    { id: "home", label: "Home", Icon: Home },
    { id: "favorites", label: "Favorites", Icon: Heart },
    { id: "new", label: "New", Icon: CalendarPlus },
    { id: "settings", label: "Settings", Icon: Settings },
  ];

  return (
    <nav className={styles.nav} aria-label="App Navigation">
      {tabs.map(({ id, label, Icon }) => {
        const isActive =
          activeTab === id ||
          (id === "settings" && (activeTab === "about" || activeTab === "info"));
        return (
          <button
            key={id}
            type="button"
            className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
            onClick={() => onSelectTab(id)}
            aria-selected={isActive}
            role="tab"
          >
            <Icon
              className={styles.icon}
              fill={isActive && id === "favorites" ? "currentColor" : "none"}
            />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
