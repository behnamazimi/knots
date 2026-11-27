import { describe, expect, test } from "vitest";
import { mapCategoryType, parseMarkdownReleaseSections } from "./changelog";

describe("changelog section parsing", () => {
  test("mapCategoryType correctly identifies types", () => {
    expect(mapCategoryType("New Features")).toBe("features");
    expect(mapCategoryType("Bug Fixes")).toBe("fixes");
    expect(mapCategoryType("Performance & Improvements")).toBe("improvements");
    expect(mapCategoryType("Special Announcements")).toBe("announcements");
    expect(mapCategoryType("Other Notes")).toBe("other");
  });

  test("parseMarkdownReleaseSections groups markdown headings into sections", () => {
    const md = `
### New Features
* Real-time Cosserat rod XPBD physics
* Offline standalone Android application

### Improvements
* Faster simulation baking
* Reduced frame latency

### Bug Fixes
* Fixed transparent changelog sheet
`;
    const sections = parseMarkdownReleaseSections(md);
    expect(sections).toHaveLength(3);
    expect(sections[0].title).toBe("New Features");
    expect(sections[0].type).toBe("features");
    expect(sections[0].items).toEqual([
      "Real-time Cosserat rod XPBD physics",
      "Offline standalone Android application",
    ]);

    expect(sections[1].title).toBe("Improvements");
    expect(sections[1].type).toBe("improvements");
    expect(sections[1].items).toEqual(["Faster simulation baking", "Reduced frame latency"]);

    expect(sections[2].title).toBe("Bug Fixes");
    expect(sections[2].type).toBe("fixes");
    expect(sections[2].items).toEqual(["Fixed transparent changelog sheet"]);
  });

  test("handles unformatted notes with fallback", () => {
    const sections = parseMarkdownReleaseSections("General stability and performance fixes.");
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe("improvements");
    expect(sections[0].items).toEqual(["General stability and performance fixes."]);
  });
});
