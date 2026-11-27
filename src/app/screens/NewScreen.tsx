import { Calendar, ChevronDown } from "lucide-react";
import { useState } from "react";
import { knots } from "../../engine/knots";
import type { KnotDef } from "../../engine/knots/types";
import { KnotGrid } from "../features/picker";
import styles from "./NewScreen.module.css";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatAddedDate(iso: string): string {
  const parts = iso.split("-").map(Number);
  if (parts.length < 3) return iso;
  const [year, month, day] = parts;
  const dayStr = day < 10 ? `0${day}` : `${day}`;
  const monthName = MONTH_NAMES[month - 1] || "";
  return `${dayStr} ${monthName} ${year}`;
}

// Explicit addition order (newest to oldest) from repository git history
const ADDITION_ORDER = [
  "daisy-chain",
  "slip-knot",
  "poachers-knot",
  "square-knot",
  "zeppelin",
  "clove-hitch",
  "bowline",
  "figure-eight",
  "overhand",
];

// Persistent cache across knot detail page navigation
let cachedCollapsedDates: Record<string, boolean> | null = null;

export function NewScreen() {
  // Sort knots from newest to oldest by addedDate, using ADDITION_ORDER as tie-breaker
  const sortedKnots = [...knots].sort((a, b) => {
    const aDate = a.addedDate || "";
    const bDate = b.addedDate || "";
    const dateCmp = bDate.localeCompare(aDate);
    if (dateCmp !== 0) return dateCmp;
    const aOrder = ADDITION_ORDER.indexOf(a.id);
    const bOrder = ADDITION_ORDER.indexOf(b.id);
    if (aOrder !== -1 && bOrder !== -1) return aOrder - bOrder;
    if (aOrder !== -1) return -1;
    if (bOrder !== -1) return 1;
    return 0;
  });

  // Group sorted knots by date
  const groups: { date: string; formattedDate: string; knots: KnotDef[] }[] = [];
  for (const knot of sortedKnots) {
    const knotDate = knot.addedDate || "2026-10-30";
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.date === knotDate) {
      lastGroup.knots.push(knot);
    } else {
      groups.push({
        date: knotDate,
        formattedDate: formatAddedDate(knotDate),
        knots: [knot],
      });
    }
  }

  // First group (latest) expanded; all older dates collapsed by default
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>(() => {
    if (cachedCollapsedDates) return cachedCollapsedDates;
    try {
      const stored = sessionStorage.getItem("knots_new_collapsed");
      if (stored) return JSON.parse(stored);
    } catch {}
    const initial: Record<string, boolean> = {};
    for (let i = 1; i < groups.length; i++) {
      initial[groups[i].date] = true;
    }
    return initial;
  });

  const toggleGroup = (date: string) => {
    setCollapsedDates((prev) => {
      const next = {
        ...prev,
        [date]: !prev[date],
      };
      cachedCollapsedDates = next;
      try {
        sessionStorage.setItem("knots_new_collapsed", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>New Knots</h1>
        <p className={styles.subtitle}>All knots in order of addition, newest to oldest</p>
      </header>

      {groups.map((group) => {
        const isCollapsed = Boolean(collapsedDates[group.date]);
        return (
          <section key={group.date} className={styles.section} aria-label={group.formattedDate}>
            <button
              type="button"
              className={styles.dateHeaderBtn}
              onClick={() => toggleGroup(group.date)}
              aria-expanded={!isCollapsed}
            >
              <Calendar className={styles.dateIcon} size={16} aria-hidden />
              <h2 className={styles.dateTitle}>{group.formattedDate}</h2>
              <span className={styles.dateCount}>
                {group.knots.length} {group.knots.length === 1 ? "knot" : "knots"}
              </span>
              <ChevronDown
                className={`${styles.chevron} ${isCollapsed ? styles.chevronCollapsed : ""}`}
                size={18}
                aria-hidden
              />
            </button>
            {!isCollapsed && <KnotGrid knots={group.knots} showFilters={false} currentTab="new" />}
          </section>
        );
      })}
    </div>
  );
}
