import { isRejectedPath } from "@/lib/parsing/reject-list";

// AGENTS.md §12: normalize + shape-check a candidate article URL. Shared by
// homepage link extraction and detail-page canonical-URL validation so both
// apply the exact same rule.

const DATE_SUFFIX = /-\d{4}-\d{2}-\d{2}\/?$/; // e.g. reuters "...-2025-09-10/"
const DATE_PATH = /\/\d{4}\/\d{2}\/\d{2}\//; // e.g. "/2025/09/10/some-slug"
const MIN_SLUG_LENGTH = 30;
const MIN_SLUG_HYPHENS = 3;

export function normalizeUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.protocol = "https:";
    url.hash = "";
    url.search = "";
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function looksLikeArticleUrl(absoluteUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(absoluteUrl);
  } catch {
    return false;
  }

  if (isRejectedPath(url.pathname)) return false;

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return false; // homepage or bare category root

  const lastSegment = segments[segments.length - 1];
  const hyphenCount = (lastSegment.match(/-/g) ?? []).length;
  const isSlugShaped = lastSegment.length >= MIN_SLUG_LENGTH || hyphenCount >= MIN_SLUG_HYPHENS;
  const hasDateMarker = DATE_SUFFIX.test(url.pathname) || DATE_PATH.test(url.pathname);
  const hasNumericId = /\d{5,}/.test(lastSegment);

  return isSlugShaped || hasDateMarker || hasNumericId;
}
