export type ChangelogCategoryType =
  | "features"
  | "improvements"
  | "fixes"
  | "announcements"
  | "other";

export interface ChangelogSection {
  title: string;
  type: ChangelogCategoryType;
  items: string[];
}

export interface ReleaseNote {
  version: string;
  title: string;
  date: string;
  sections: ChangelogSection[];
  highlights?: string[];
}

export function mapCategoryType(title: string): ChangelogCategoryType {
  const lower = title.toLowerCase();
  if (lower.includes("feature")) return "features";
  if (lower.includes("fix") || lower.includes("bug")) return "fixes";
  if (lower.includes("improve") || lower.includes("perf") || lower.includes("refactor"))
    return "improvements";
  if (lower.includes("announce")) return "announcements";
  return "other";
}

export function parseMarkdownReleaseSections(markdown: string): ChangelogSection[] {
  if (!markdown || !markdown.trim()) {
    return [
      {
        title: "Improvements",
        type: "improvements",
        items: ["Bug fixes and performance improvements"],
      },
    ];
  }

  const cleanedMarkdown = markdown.replace(/<!--[\s\S]*?-->/g, "");
  const lines = cleanedMarkdown.split(/\r?\n/);
  const sections: ChangelogSection[] = [];
  let currentTitle = "";
  let currentItems: string[] = [];

  const flush = () => {
    if (currentTitle && currentItems.length > 0) {
      sections.push({
        title: currentTitle,
        type: mapCategoryType(currentTitle),
        items: currentItems,
      });
    } else if (!currentTitle && currentItems.length > 0) {
      sections.push({
        title: "Improvements",
        type: "improvements",
        items: currentItems,
      });
    }
    currentItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("**Full Changelog**:")) continue;

    const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      flush();
      currentTitle = headingMatch[1].trim();
      continue;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      const cleaned = bulletMatch[1].replace(/\s+by\s+@\S+\s+in\s+https?:\/\/\S+$/i, "").trim();
      if (cleaned) currentItems.push(cleaned);
    } else if (currentTitle) {
      currentItems.push(line);
    } else {
      currentItems.push(line);
    }
  }
  flush();

  return sections.length > 0
    ? sections
    : [
        {
          title: "Improvements",
          type: "improvements",
          items: [markdown.trim()],
        },
      ];
}

export const RELEASE_HISTORY: ReleaseNote[] = [
  {
    version: "v0.1.0",
    title: "Android App Launch",
    date: "November 2026",
    sections: [
      {
        title: "New Features",
        type: "features",
        items: [
          "3D animated knot viewer with real-time physics (9 knots)",
          "Android app with favorites, sharing via QR, dark/light theme",
          'New tab showing recently added knots, with "New" badge',
          "In-app update checker",
        ],
      },
      {
        title: "Improvements",
        type: "improvements",
        items: ["Faster rope texture loading with render caching"],
      },
    ],
  },
];
