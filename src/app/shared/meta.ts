import type { MetaDescriptor } from "react-router";
import type { KnotDef } from "../../engine/knots/types";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl, knotImagePath, knotPath } from "./site";

/** Title, description, canonical link and share preview (Open Graph, Twitter) for a knot's page. */
export function knotMeta(knot: KnotDef): MetaDescriptor[] {
  const title = `${knot.name} · ${SITE_NAME}`;
  const url = absoluteUrl(knotPath(knot.id));
  const image = absoluteUrl(knotImagePath(knot.id));
  return [
    { title },
    { name: "description", content: knot.summary },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: title },
    { property: "og:description", content: knot.summary },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: `A finished ${knot.name.toLowerCase()}` },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

/** The front page: the site's own title and description, with the first knot's picture. */
export function homeMeta(first: KnotDef): MetaDescriptor[] {
  return knotMeta(first).map((d) => {
    if ("title" in d) return { title: SITE_NAME };
    if ("name" in d && d.name === "description") return { ...d, content: SITE_DESCRIPTION };
    if ("property" in d && d.property === "og:title") return { ...d, content: SITE_NAME };
    if ("property" in d && d.property === "og:description")
      return { ...d, content: SITE_DESCRIPTION };
    if ("property" in d && d.property === "og:url") return { ...d, content: absoluteUrl("/") };
    if ("rel" in d) return { ...d, href: absoluteUrl("/") };
    return d;
  });
}
