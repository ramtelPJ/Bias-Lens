// Canonical non-article reject list — AGENTS.md §9. Update here only; every
// other section refers back to this list instead of repeating it.
const REJECT_PATH_PATTERNS: RegExp[] = [
  /\/(section|sections|category|categories|topic|topics|tag|tags)(\/|$)/i,
  /\/(author|authors|profile|profiles)(\/|$)/i,
  /\/search(\/|$|\?)/i,
  /\/(nav|navigation|menu|footer)(\/|$)/i,
  /\/(show|shows|program|programs|podcast|podcasts)(\/|$)/i,
  /\/live(\/|$)/i,
  /\/(game|games)(\/|$)/i,
  /\/(product|products|review|reviews|shop|shopping|store)(\/|$)/i,
  /\/(about|contact|support|help|careers|jobs|advertise|privacy|terms|corporate)(\/|$)/i,
  /\/(newsletter|newsletters|subscribe|subscription|subscriptions)(\/|$)/i,
  /\/video(\/|$)/i, // video-only pages; a page with full article text alongside video passes the content gate, not this filter
];

export function isRejectedPath(pathname: string): boolean {
  return REJECT_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}
